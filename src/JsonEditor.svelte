<script type="ts">
  import { draggable } from '@neodrag/svelte';
  import { bodyDragging } from './uiStore';
  import titleBarIcon from './assets/json.png';
  import { JSONEditor, toJSONContent, toTextContent } from 'svelte-jsoneditor';
  import { isJsonEditorOpen, jsonEditorInput, jsonEditorOutput, downloadJsonToken, shareJsonToken } from './jsonEditorStore';
  import { tick } from 'svelte';
  import { shareTemplate } from './firebase';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { makeFilename } from './lib/layeredCanvas/saveCanvas.js';

  let content = { text: "hello" };
  let skipJsonChange = false;

  function handleChange(updatedContent, previousContent, { contentErrors, patchResult }) {
    // content is an object { json: JSONValue } | { text: string }
    // console.log('onChange: ', { updatedContent, previousContent, contentErrors, patchResult })
    if (skipJsonChange) {
      // console.log("skipJsonChange");
      return;
    }
    content = updatedContent
    try {
      $jsonEditorInput = toJSONContent(updatedContent).json;
    }
    catch (e) {
      // 捏造
      console.log("invalid json", e);
    }
  }

  function replacer(key, value) {
    if (typeof value === 'number' && !Number.isInteger(value)) {
      return parseFloat(value.toFixed(2)); // 小数点以下2限制为位数
    }
    return value;
  }

  $:onOutputJsonDocument($jsonEditorOutput);
  async function onOutputJsonDocument(json) {
    skipJsonChange = true;
    content = { text: JSON.stringify(json, replacer, 2) };
    await tick(); // hack
    skipJsonChange = false;
  }

  $:onDownloadJsonDocument($downloadJsonToken);
  function onDownloadJsonDocument(t) {
    if (!t) { return; }

    const jsonString = toTextContent(content).text;
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = makeFilename('json');
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 0);
    $downloadJsonToken = false;
  }

  $:onShareJsonDocument($shareJsonToken);
  async function onShareJsonDocument(t) {
    if (!t) { return; }

    console.log("onShareJsonDocument");
    const jsonString = toTextContent(content).text;
    const key = await shareTemplate(jsonString);
    const url = new URL(window.location.href);
    const params = url.searchParams;
    params.set('key', key);
    url.search = params.toString();
    const shareUrl = url.toString();
    navigator.clipboard.writeText(shareUrl);
    toastStore.trigger({ message: '钻孔机ー共享URL复制ー我做了', timeout: 1500});
    $shareJsonToken = false;
  }
</script>

{#if $isJsonEditorOpen}
<div class="control-panel variant-glass-surface rounded-container-token vbox" use:draggable={{ handle: '.title-bar' }} style="pointer-events: {$bodyDragging ? 'none' : 'auto'};">
  <div class="title-bar variant-filled-surface rounded-container-token expand"><img class="title-image" src={titleBarIcon} alt="title"/></div>
  <div class="inner expand">
    <JSONEditor {content} mode="text" onChange="{handleChange}"/>
  </div>
</div>
{/if}

<style>
  .control-panel {
    position: absolute;
    width: 440px;
    height: 650px;
    display: flex;
    flex-direction: column;
    top: 200px;
    left: 800px;
  }
  .title-bar {
    cursor: move;
    padding: 2px;
    margin: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .title-image {
    width: 32px;
    height: 32px;
  }
  .inner {
    padding: 8px;
    height: 600px;
  }
  .inner :global(.cm-line) {
    text-align: left;
  }
</style>
