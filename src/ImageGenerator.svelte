<script lang="ts">
  import { imageGeneratorOpen, imageGeneratorPrompt, imageGeneratorGallery, imageGeneratorChosen } from "./imageGeneratorStore";
  import { generateImages, getProgression } from "./sdwebui";
  import { ProgressBar } from '@skeletonlabs/skeleton';
	import Gallery from './Gallery.svelte';
  import SliderEdit from './SliderEdit.svelte';
  import Drawer from './Drawer.svelte';
  import KeyValueStorage from "./KeyValueStorage.svelte";
  import { tick, onMount } from "svelte";
  import { toastStore } from '@skeletonlabs/skeleton';
  import { makeWhiteImage } from "./imageUtil";
  import { imageToBase64 } from "./lib/layeredCanvas/saveCanvas";
  import { ref } from "firebase/database";

  let url: string = "http://localhost:7860";
  let images: HTMLImageElement[] = [];
  let imageRequest = {
     "positive": "1 cat",
     "negative": "EasyNegative",
     "width": 512,
     "height": 512,
     "batchSize": 3,
     "batchCount": 3,
     "samplingSteps": 20,
     "cfgScale": 7,
  }
  let calling;
  let progress = 0;
  let storage;
  let refered;

/*
  const x = [new Image(), new Image(), new Image()];
  x[0].src = i1;
  x[1].src = i2;
  x[2].src = i3;
*/

  $: imageRequest.positive = $imageGeneratorPrompt;
  $: onChangeGallery($imageGeneratorGallery);
  async function onChangeGallery(gallery) {
    if (gallery) {
      images = [];
      await tick(); // HACK: 如果不这样做的话HTML未更新
      images = gallery;
    }
  }

  async function generate() {
    let f = null;
    f = async () => {
      storage.set("imageRequest", JSON.stringify(imageRequest));
      storage.set("url", url);
      const data = await getProgression(url);
      if (calling) {
        progress = data.progress;
      }

      // getPorgression调用1因为超秒的话会讨厌
      // setInterval不使用
      setTimeout(
        () => {
          if (calling) {
            f();
          }
        },
        1000);
    };

    calling = true;
    f();
    try {
      const newImages = await generateImages(url, imageRequest);
      images.splice(images.length, 0, ...newImages);
      images = images;
      progress = 1;
    } catch (e) {
      console.log(e);
      toastStore.trigger({ message: `图像生成错误ー: ${e}`, timeout: 3000});
      progress = 0;
    }
    calling = false;
  }

  function onChooseImage({detail}) {
    console.log("chooseImage", detail);
    $imageGeneratorChosen = detail;
    $imageGeneratorOpen = false;
  }

  onMount(async () => {
    await storage.isReady();
    const data = await storage.get("imageRequest");
    url = await storage.get("url") ?? url;
    if (data) {
      imageRequest = JSON.parse(data);
    }
  });

  function onClickAway() {
    if (calling) { return; }
    $imageGeneratorOpen = false;
  }

  async function generateWhiteImage() {
    const img = await makeWhiteImage(imageRequest.width, imageRequest.height);
    images.push(img);
    images = images;
  }

  async function scribble() {
    if (!refered) {
      toastStore.trigger({ message: `请选择参考画像`, timeout: 3000});
      return;
    } 

    let f = null;
    f = async () => {
      storage.set("imageRequest", JSON.stringify(imageRequest));
      storage.set("url", url);
      const data = await getProgression(url);
      if (calling) {
        progress = data.progress;
      }

      // getPorgression调用1因为超秒的话会讨厌
      // setInterval不使用
      setTimeout(() => {if (calling) {f();}},1000);
    };

    calling = true;
    f();
    try {
      const encoded_image = imageToBase64(refered);

      const alwayson_scripts = {
        controlNet: {
          args: [
            {
              input_image: encoded_image,
              module: "scribble_xdog",
              model: "control_v11p_sd15_scribble [d4ba51ff]",
              weight: 0.75,
              resize_mode: 0,
              threshold_a: 32,
            }
          ]
        }
      };
      console.log(alwayson_scripts);

      const req = { ...imageRequest, alwayson_scripts };
      const newImages = await generateImages(url, req);
      images.splice(images.length, 0, ...newImages);
      images = images;
      progress = 1;
    } catch (e) {
      console.log(e);
      toastStore.trigger({ message: `图像生成错误ー: ${e}`, timeout: 3000});
      progress = 0;
    }
    calling = false;

  }

</script>

<div class="drawer-outer">
  <Drawer
    open={$imageGeneratorOpen}
    placement="right"
    size="720px"
    on:clickAway={onClickAway}
  >
    <div class="drawer-content">
      <p>URL</p>
      <input style="width: 100%;" bind:value={url}/>
      <p>prompt</p>
      <textarea bind:value={imageRequest.positive}/>
      <p>negative prompt</p>
      <textarea bind:value={imageRequest.negative}/>

      <div class="hbox gap-5">
        <div class="vbox" style="width: 400px;">
          <SliderEdit label="width" bind:value={imageRequest.width} min={512} max={2048} step={64}/>
          <SliderEdit label="height" bind:value={imageRequest.height} min={512} max={2048} step={64}/>
        </div>

        <div class="vbox">
          <SliderEdit label="batch count" bind:value={imageRequest.batchCount} min={1} max={100} step={1}/>
          <SliderEdit label="batch size" bind:value={imageRequest.batchSize} min={1} max={8} step={1}/>
        </div>
      </div>

      <div class="hbox gap-5" style="width: 700px;">
        <SliderEdit label="steps" bind:value={imageRequest.samplingSteps} min={1} max={200} step={1}/>
        <SliderEdit label="CFG Scale" bind:value={imageRequest.cfgScale} min={1} max={30} step={0.5}/>
      </div>

      <div class="hbox gap-5">
        <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={generate}>
          Generate
        </button>

        <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={generateWhiteImage}>
          White Image
        </button>

        <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={scribble}>
          Scribble
        </button>
      </div>

      <ProgressBar label="Progress Bar" value={progress} max={1} />
      <Gallery columnWidth={220} bind:images={images} on:commit={onChooseImage} bind:refered={refered}/>
    </div>
  </Drawer>
</div>

<KeyValueStorage bind:this={storage} dbName={"image-generator"} storeName={"generation-request"}/>

<style>
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  .drawer-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    margin: 16px;
  }
  textarea {
    align-self: stretch;
  }
  .generate-button {
    width: 160px;
  }
</style>
