<script type="ts">
  import Drawer from './Drawer.svelte'
  import { aboutOpen } from './aboutStore';
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';

  function showComic() {
    const d: ModalSettings = {
      type: 'component',
      component: 'comic',
    };
    modalStore.trigger(d);    
  }
</script>


<div class="drawer-outer">
<Drawer open={$aboutOpen} size="600px" on:clickAway={() => $aboutOpen = false}>
  <div class="drawer-content">
    <h2>FramePlanner</h2>

    <p>
      <a href="https://github.com/jonigata/FramePlanner2" target="_blank" rel="noopener noreferrer">github</a>
      <a href="https://twitter.com/jonigata_ai" target="_blank" rel="noopener noreferrer">twitter</a>
      <a href="https://t.co/UC3jJOJJtS" target="_blank" rel="noopener noreferrer">anonymous request</a>
    </p>

    <p>
      <a href="https://www.chichi-pui.com/posts/tags/FramePlanner/" target="_blank" rel="noopener noreferrer">地面宽度</a>
      <a href="https://twitter.com/hashtag/frameplanner?src=hashtag_click&f=live" target="_blank" rel="noopener noreferrer">#frameplanner(Twitter)</a>
    </p>

    <p>
      介绍文章: <a href="https://blogcake.net/ai-comic/" target="_blank" rel="noopener noreferrer">AI画漫画！？FramePlanner漫画制作方法</a>
    </p>

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <p><span class="comic-link" on:click={showComic}>第一次的FramePlanner</span>(<a href="https://twitter.com/aiai61555228" target="_blank" rel="noopener noreferer">@aiai61555228</a>)</p>
  
    <h2>快捷键</h2>

    <h3>页面</h3>
    <p>Space + Drag: 画线ー旋转</p>
    <p>Wheel: 引爆ー姆，姆</p>
    <p>Undo/Redo: Ctrl+Z/Shift+Ctrl+Z</p>

    <h3>方格</h3>
    <p><b>拖放画像: 嵌入</b></p>
    <p>Q+Click: 删除</p>
    <p>W+Click: 水平拆装</p> 
    <p>S+Click: 垂直分解</p> 
    <p>D+Click: 删除图像</p>
    <p>T+Click: 画像左右翻転</p>
    <p>Y+Click: 画像上下翻転</p>
    <p>E+Click: 画像适配</p>
    <p>B+拖曳: 填充更改</p>
<br/>
    <p>拖曳: 画像移动(+Shift初次见面)</p>
    <p>Ctrl+拖曳: 画像缩小ー旋转(+Shift初次见面)</p>
    <p>Alt+拖曳: 图像旋转</p>

    <h3>其他</h3>
    <p>Alt+拖曳: 移动</p>
    <p>F+拖曳: 创建</p>
    <p>双撃: 创建</p>
    <p>Q+单击机能区上: 删除</p>
    <p>S+拖曳(添加到对象): 复制方式ー</p>
    <p>拖放画像: 图像模糊化</p>
    <p>修改文本ー裁减: 创建</p>
    <p>换行符ー裁减: 一气呵成</p>

    <h3>画像</h3>
    <p>拖曳: 移动</p>
    <p>Ctrl+拖曳: 滑冰ー旋转</p>
    <p>将画像文件放在左上角的页脚画像上: 创建</p>
    <p>放大图像ー裁减: 创建</p>

    <h3>格式导出文件时，将显示此对话框</h3>
    <p>Ctrl+拖曳: 粗细</p>
    <p>Shift+拖曳: 倾斜</p>
    <p>※关于倾斜过度，请自己担当</p>

    <h3>sdwebui协作</h3>
    <dl>
      <dt>API启用CORS支持</dt>
      <dd>sdwebui起动时COMMANDLINE_ARGS在…之上'--api --cors-allow-origins https://frameplanner-e5569.web.app'的规格化距离的幂函数</dd>
      <dt>Mixed contet支持</dt>
      <dd>执行下列操作之一：
        <ol>
          <li>sdwebui打开https主机</li>
          <li>sdwebui单击机能区上ngrok使用等</li>
          <li><a href="https://t.co/m48tNsHWzB">降低阅覧器安全性</a></li>
        </ol>
      </dd>
      <dt>URL输入</dt>
      <dd>各格的「<img style="display: inline;" width="18" height="18" src='./src/assets/generate-image.png' alt="generate"/>图像生成」   按钮，按钮，单击「URL」在…之上sdwebui打开URL的双曲正切值</dd>
      <dt>scribble</dt>
      <dd><a href="https://twitter.com/jonigata_ai/status/1659567680695992320">相关视频(Twitter)</a></dd>
    </dl>

    <h2>Q&A</h2>
    <dl>
      <dt>Q.「钻孔机ー用螺纹」屏蔽了，但是想用</dt>
      <dd>A.阅覧器设置の各駅点の安全性において「许可」标记元素の表示属性を改正する。单击机能区上URL栏の键画像はいいようです。</dd>
      <dt>Q.鱼翅の透明度を変えたい</dt>
      <dd>A.因为Fukidashi检验器下面有颜色设定，单击那里卡拉OKー提取器ー右端の透明滑块ー标记元素的表示属性</dd>
    </dl>

    <h2>注意事项</h2>
    <ul>
      <li>Share功能制作的文件有时会突然消失，没有预告</li>
    </ul>
  </div>
</Drawer>
</div>

<style>
  .drawer-content {
    width: 100%;
    height: 100%;
    font-family: 'Yu Gothic', sans-serif;
    font-weight: 500;
    text-align: left;
    padding-top: 16px;
    padding-left: 16px;
  }
  h2 {
    margin-top: 16px;
  }
  h3 { 
    margin-top: 8px;
  }
  p {
    margin-left: 32px;
  }
  dt {
    font-weight: 700;
    margin-top: 8px;
    margin-left: 16px;
  }
  dd {
    margin-left: 32px;
  }
  ul {
    margin-left: 32px;
  }
  ol {
    margin-left: 32px;
  }
  ol li {
    list-style-type: none;
    counter-increment: cnt;
  }
  ol li::before {
    content: counter(cnt)". ";
  }
  .comic-link {
    cursor: pointer;
    text-decoration: underline;
    color: #0000ff;
  }

  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
</style>