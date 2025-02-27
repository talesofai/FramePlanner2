<script lang="ts">
  import { onMount } from 'svelte';
  import Drawer from './Drawer.svelte'
  import { SlideToggle } from '@skeletonlabs/skeleton';
  import HistoryStorage from './HistoryStorage.svelte';
  import WebFontList from './WebFontList.svelte';
  import { fontChooserOpen, chosenFont } from './fontStore';
  import trash from './assets/trash.png';

  let searchOptions = { filterString: '', mincho: true, gothic: true, normal: true, bold: true };
  let drawerPage = 0;
  let fontList = null;
  let localFontName;
  let localFonts = [];
  let historyStorage;

  function setLocalFont() {
    $fontChooserOpen = false;
    if (localFontName) {
      console.log(localFontName);
      chosenFont.set({ fontFamily: localFontName, fontWeight: '400' })
      addHistory(localFontName);
    }
  }

  function onChangeFont(event) {
    chosenFont.set(event.detail);
    if (!event.detail.event.ctrlKey) {
      $fontChooserOpen = false;
    }
  }

  function addHistory(fontFamily) {
    historyStorage.add(fontFamily);
    localFonts.push(fontFamily);
  }

  function removeFromHistory(fontFamily) {
    historyStorage.remove(fontFamily);
    localFonts = localFonts.filter((f) => f !== fontFamily);
  }

  $:onChangeSearchOptions(searchOptions);
  function onChangeSearchOptions(options) {
    if (fontList) {
      fontList.searchOptions = options;
    }
  }

  function allOff() {
    searchOptions.mincho = false;
    searchOptions.gothic = false;
    searchOptions.normal = false;
    searchOptions.bold = false;
  }

  onMount(async () => {
    await historyStorage.isReady();
    historyStorage.getAll().onsuccess = (e) => {
      localFonts = e.target.result;
    };
  });

</script>

<div class="drawer-outer">
  <Drawer open={$fontChooserOpen} placement="right" size="720px" on:clickAway={() => $fontChooserOpen = false}>
  <div class="drawer-content">
    {#if drawerPage === 0}
    <button class="drawer-page-right px-2 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button" on:click={() => drawerPage = 1}>roー卡尔 &gt;</button>
    {:else}
    <button class="drawer-page-left px-2 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button" on:click={() => drawerPage = 0}>&lt; Web格式导出文件时，将显示此对话框</button>
    {/if}
    <h1>格式导出文件时，将显示此对话框</h1>
    {#if drawerPage === 0}
    <div class="hbox gap my-2">
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.mincho}></SlideToggle>明确的
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.gothic}></SlideToggle>哥哥
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.normal}></SlideToggle>N
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.bold}></SlideToggle>B
      <button class="px-2 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button" on:click={allOff}>全部关闭</button>
    </div>
    <hr/>
    <WebFontList on:choose={onChangeFont} bind:this={fontList}/>
    {/if}
    {#if drawerPage === 1}
    <div class="custom-font-panel">
      <input type="text" class="input px-2" bind:value={localFontName} placeholder="字体名称" />
      <button class="px-2 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button" on:click={setLocalFont}>聘用</button>
    </div>
    {/if}
    {#each localFonts as font}
      <div class="font-sample hbox" style="font-family: '{font}'">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <span on:click={event=>onChangeFont({detail:{event,fontWeight:"400",fontFamily:font}})}>{font} 今天天气真好啊</span>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <img src={trash} width="20" height="20" alt="trash" on:click={() => removeFromHistory(font)}/>
      </div>
    {/each}
  </div>
</Drawer>
</div>

<HistoryStorage bind:this={historyStorage}/>

<style> 
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  .drawer-content {
    position: relative;
  }
  .drawer-page-right {
    position: absolute;
    right: 16px;
    top: 16px;
  }
  .drawer-page-left {
    position: absolute;
    left: 16px;
    top: 16px;
  }
  .custom-font-panel {
    display: flex;
    flex-direction: column;
    gap: 32px;
    align-items: center;
    padding: 32px;
  }
  .font-sample {
    font-size: 22px;
    cursor: pointer;
  }
  .font-sample img {
    margin-left: 8px;
    cursor: pointer;
  }

</style>

