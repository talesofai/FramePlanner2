import { Layer } from "./layeredCanvas.js";
import { FrameElement, calculatePhysicalLayout, findLayoutAt, findLayoutOf, findBorderAt, findPaddingAt, makeBorderTrapezoid, makePaddingTrapezoid, rectFromPositionAndSize } from "./frameTree.js";
import { translate, scale } from "./pictureControl.js";
import { keyDownFlags } from "./keyCache.js";
import { ClickableIcon, MultistateIcon } from "./clickableIcon.js";

export class FrameLayer extends Layer {
  constructor(frameTree, interactable, onCommit, onRevert) {
    super();
    this.frameTree = frameTree;
    this.interactable = interactable;
    this.onCommit = onCommit;
    this.onRevert = onRevert;

    const isFrameActive = () => this.interactable && this.focusedLayout && !this.pointerHandler;
    const isFrameActiveAndVisible = () => this.interactable && 0 < this.focusedLayout?.element.visibility && !this.pointerHandler;
    this.splitHorizontalIcon = new ClickableIcon("split-horizontal.png",[0, 0],[32, 32], "横に分割", isFrameActiveAndVisible);
    this.splitVerticalIcon = new ClickableIcon("split-vertical.png",[0, 0],[32, 32], "縦に分割", isFrameActiveAndVisible);
    this.deleteIcon = new ClickableIcon("delete.png", [0, 0], [32, 32], "削除", isFrameActive);
    this.zplusIcon = new ClickableIcon("zplus.png", [0, 0], [32, 32], "手前に", isFrameActiveAndVisible);
    this.zminusIcon = new ClickableIcon("zminus.png", [0, 0], [32, 32], "奥に", isFrameActiveAndVisible);
    this.visibilityIcon = new MultistateIcon(["visibility1.png","visibility2.png","visibility3.png"], [0, 0], [32, 32], "不可視/背景と絵/枠線も", () => this.interactable && this.focusedLayout && !this.pointerHandler);
    this.visibilityIcon.index = 2;

    const isImageActive = () => this.interactable && this.focusedLayout?.element.image && !this.pointerHandler;
    this.scaleIcon = new ClickableIcon("scale.png", [0, 0], [32, 32], "スケール", () => this.interactable && this.focusedLayout?.element.image);
    this.dropIcon = new ClickableIcon("drop.png", [0, 0], [32, 32], "画像除去", isImageActive);
    this.flipHorizontalIcon = new ClickableIcon("flip-horizontal.png", [0, 0], [32, 32], "左右反転", isImageActive);
    this.flipVerticalIcon = new ClickableIcon("flip-vertical.png", [0, 0], [32, 32], "上下反転", isImageActive);

    const isBorderActive = (dir) => this.interactable && this.focusedBorder?.layout.dir === dir;
    this.expandHorizontalIcon = new ClickableIcon("expand-horizontal.png",[0, 0],[32, 32], "幅を変更", () => isBorderActive('h'));
    this.slantHorizontalIcon = new ClickableIcon("slant-horizontal.png", [0, 0], [32, 32], "傾き", () => isBorderActive('h'));
    this.expandVerticalIcon = new ClickableIcon("expand-vertical.png",[0, 0],[32, 32], "幅を変更", () => isBorderActive('v'));
    this.slantVerticalIcon = new ClickableIcon("slant-vertical.png", [0, 0], [32, 32], "傾き", () => isBorderActive('v'));

    this.transparentPattern = new Image();
    this.transparentPattern.src = new URL("../../assets/transparent.png",import.meta.url).href;

    this.frameIcons = [this.splitHorizontalIcon, this.splitVerticalIcon, this.deleteIcon, this.zplusIcon, this.zminusIcon, this.visibilityIcon, this.scaleIcon, this.dropIcon, this.flipHorizontalIcon, this.flipVerticalIcon];
    this.borderIcons = [this.slantVerticalIcon, this.expandVerticalIcon, this.slantHorizontalIcon, this.expandHorizontalIcon];
  }

  render(ctx) {
    const size = this.getPaperSize();

    // fill background
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgb(255,255,255, 1)";
    ctx.fillRect(0, 0, ...size);
    ctx.restore();

    const layout = calculatePhysicalLayout(this.frameTree, size, [0, 0]);
    const inheritanceContext = { borderColor: "black", borderWidth: 1 };
    const deferred = [];
    this.renderElement(ctx, layout, inheritanceContext, deferred);
    deferred.sort((a, b) => a.layout.element.z - b.layout.element.z);
    for (const def of deferred) {
      this.renderElementLeaf(ctx, def.layout, def.inheritanceContext);
    }

    if (!this.interactable) {
      return;
    }

    if (0 < this.focusedLayout?.element.visibility) {
      ctx.font = '24px serif';
      ctx.fillStyle = "#86C8FF";
      const l = this.focusedLayout;
      ctx.fillText(l.element.z, l.origin[0]+64, l.origin[1]+28);
    }

    if (this.focusedPadding) {
      ctx.fillStyle = "rgba(200,200,0, 0.7)";
      ctx.beginPath();
      this.trapezoidPath(ctx, this.focusedPadding.trapezoid);
      ctx.fill();
    }

    if (this.focusedBorder) {
      ctx.fillStyle = "rgba(0,200,200,0.7)";
      ctx.beginPath();
      this.trapezoidPath(ctx, this.focusedBorder.trapezoid);
      ctx.fill();
    }

    if (this.focusedLayout) {
      ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
      ctx.strokeRect(...this.focusedLayout.rawOrigin, ...this.focusedLayout.rawSize);
    }

    this.frameIcons.forEach(icon => icon.render(ctx));
    this.borderIcons.forEach(icon => icon.render(ctx));
  }

  renderElement(ctx, layout, inheritanceContext, deferred) {
    if (layout.element.borderColor != null) { 
      inheritanceContext.borderColor = layout.element.borderColor;
    }
    if (layout.element.borderWidth != null) {
      inheritanceContext.borderWidth = layout.element.borderWidth;
    }

    if (layout.children) {
      this.renderBackground(ctx, layout, inheritanceContext);
      for (let i = 0; i < layout.children.length; i++) {
        this.renderElement(ctx, layout.children[i], inheritanceContext, deferred);
      }
    } else {
      deferred.push({ layout, inheritanceContext });
    }
  }

  renderElementLeaf(ctx, layout, inheritanceContext) {
    this.renderBackground(ctx, layout, inheritanceContext);

    const element = layout.element;
    if (1 <= element.visibility && element.image) {
      // clip
      ctx.save();
      ctx.clip();

      const [x0, y0, x1, y1] = [
        Math.min(layout.corners.topLeft[0], layout.corners.bottomLeft[0]),
        Math.min(layout.corners.topLeft[1], layout.corners.topRight[1]),
        Math.max(layout.corners.topRight[0], layout.corners.bottomRight[0]),
        Math.max(layout.corners.bottomLeft[1], layout.corners.bottomRight[1]),
      ]

      ctx.translate((x0 + x1) * 0.5 + element.translation[0], (y0 + y1) * 0.5 + element.translation[1]);
      ctx.scale(element.scale[0] * element.reverse[0], element.scale[1] * element.reverse[1]);
      ctx.translate(-element.image.width * 0.5, -element.image.height * 0.5);
      ctx.drawImage(element.image, 0, 0);

      // unclip
      ctx.restore();
    }

    if (element.visibility === 2) {
      const borderWidth = inheritanceContext.borderWidth;
      if (0 < borderWidth) {
        ctx.strokeStyle = inheritanceContext.borderColor;
        ctx.lineWidth = borderWidth;
        ctx.stroke();
      }
    }
  }

  renderBackground(ctx, layout, inheritanceContext) {
    if (layout.element.visibilty === 0) { return; }
    ctx.beginPath();
    ctx.lineJoin = "miter";
    this.trapezoidPath(ctx, layout.corners);

    if (layout.element.bgColor) {
      ctx.fillStyle = layout.element.bgColor;
      ctx.fill();
    }
  }

  trapezoidPath(ctx, corners) {
    ctx.moveTo(...corners.topLeft);
    ctx.lineTo(...corners.topRight);
    ctx.lineTo(...corners.bottomRight);
    ctx.lineTo(...corners.bottomLeft);
    ctx.lineTo(...corners.topLeft);
    ctx.closePath();
  }

  dropped(image, position) {
    const layout = calculatePhysicalLayout(
      this.frameTree,
      this.getPaperSize(),
      [0, 0]
    );
    let layoutlet = findLayoutAt(layout, position);
    if (layoutlet) {
      this.importImage(layoutlet, image);
      return true;
    }
    return false;
  }

  updateFocus(point) {
    const layout = calculatePhysicalLayout(this.frameTree, this.getPaperSize(), [0, 0]);

    const setUpFocusedLayout = () => {
      const origin = this.focusedLayout.origin;
      const size = this.focusedLayout.size;
      const [x, y] = [origin[0] + size[0] / 2, origin[1] + size[1] / 2];
      this.splitHorizontalIcon.position = [x + 32, y];
      this.splitVerticalIcon.position = [x, y + 32];
      this.deleteIcon.position = [origin[0] + size[0] - 32, origin[1]];
      this.zplusIcon.position = [origin[0] + 80, origin[1]];
      this.zminusIcon.position = [origin[0] + 32, origin[1]];
      this.visibilityIcon.position = [origin[0], origin[1]];
      this.visibilityIcon.index = this.focusedLayout.element.visibility;

      this.scaleIcon.position = [origin[0] + size[0] - 32, origin[1] + size[1] - 32];
      this.dropIcon.position = [origin[0], origin[1] + size[1] - 32];
      this.flipHorizontalIcon.position = [origin[0] + 48, origin[1] + size[1] - 32];
      this.flipVerticalIcon.position = [origin[0] + 72, origin[1] + size[1] - 32,];
      this.redraw();

      if (this.hintIfContains(point, this.frameIcons)) {
      } else if (this.focusedLayout.element.image) {
        this.hint([x, origin[1] + 16],"ドラッグで移動、Ctrl+ドラッグでスケール");
      } else if (0 < this.focusedLayout.element.visibility) {
        this.hint([x, origin[1] + 48], "画像をドロップ");
      } else {
        this.hint([x, origin[1] + 48], null);
      }
      return;
    }

    this.focusedPadding = null;
    this.focusedBorder = null;
    this.focusedLayout = null;

    if (keyDownFlags["KeyB"]) {
      this.focusedPadding = findPaddingAt(layout, point);
      if (this.focusedPadding) {
        this.hint(point, "ドラッグでパディング変更");
        this.redraw();
      }
      return;
    }

    this.focusedBorder = findBorderAt(layout, point);
    if (this.focusedBorder) {
      this.updateBorderIconPositions(this.focusedBorder);
      this.redraw();

      if (!this.hintIfContains(point, this.borderIcons)) {
        this.hint(point, null);
      }
      return;
    } 
  
    this.focusedLayout = findLayoutAt(layout, point);
    this.hint(point, null);
    if (this.focusedLayout) {
      setUpFocusedLayout();
    }
  }

  pointerHover(point) {
    if (keyDownFlags["Space"]) { return; }
    this.updateFocus(point);
  }

  accepts(point) {
    if (!this.interactable) {return null;}
    if (keyDownFlags["Space"]) {return null;}

    this.updateFocus(point);

    if (keyDownFlags["KeyB"]) {
      if (this.focusedPadding) {
        return { padding: this.focusedPadding };
      }
    }

    if (this.focusedBorder) {
      return { border: this.focusedBorder };
    }

    const layout = this.focusedLayout;
    if (layout) {
      if (keyDownFlags["KeyQ"]) {
        FrameElement.eraseElement(this.frameTree, layout.element);
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.redraw();
        return null;
      }
      if (keyDownFlags["KeyW"]) {
        FrameElement.splitElementHorizontal(
          this.frameTree,
          layout.element
        );
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.redraw();
        return null;
      }
      if (keyDownFlags["KeyS"]) {
        FrameElement.splitElementVertical(
          this.frameTree,
          layout.element
        );
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.redraw();
        return null;
      }
      if (keyDownFlags["KeyD"]) {
        layout.element.image = null;
        this.redraw();
        return null;
      }
      if (keyDownFlags["KeyT"]) {
        layout.element.reverse[0] *= -1;
        this.redraw();
        return null;
      }
      if (keyDownFlags["KeyY"]) {
        layout.element.reverse[1] *= -1;
        this.redraw();
        return null;
      }
      if (this.splitHorizontalIcon.contains(point)) {
        FrameElement.splitElementHorizontal(
          this.frameTree,
          layout.element
        );
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.focusedLayout = null;
        this.redraw();
        return null;
      }
      if (this.splitVerticalIcon.contains(point)) {
        FrameElement.splitElementVertical(
          this.frameTree,
          layout.element
        );
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.focusedLayout = null;
        this.redraw();
        return null;
      }
      if (this.deleteIcon.contains(point)) {
        FrameElement.eraseElement(this.frameTree, layout.element);
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.focusedLayout = null;
        this.redraw();
        return null;
      }
      if (this.zplusIcon.contains(point)) {
        layout.element.z += 1;
        this.onCommit(this.frameTree);
        this.redraw();
        return null;
      }
      if (this.zminusIcon.contains(point)) {
        layout.element.z -= 1;
        this.onCommit(this.frameTree);
        this.redraw();
        return null;
      }
      if (this.visibilityIcon.contains(point)) {
        this.visibilityIcon.increment();
        layout.element.visibility = this.visibilityIcon.index;
        this.onCommit(this.frameTree);
        this.redraw();
        return null;
      }

      if (this.dropIcon.contains(point)) {
        layout.element.image = null;
        this.redraw();
      } else if (this.flipHorizontalIcon.contains(point)) {
        layout.element.reverse[0] *= -1;
        this.redraw();
      } else if (this.flipVerticalIcon.contains(point)) {
        layout.element.reverse[1] *= -1;
        this.redraw();
      } else {
        return { layout: layout };
      }
    }

    return null;
  }

  async *pointer(p, payload) {
    if (payload.layout) {
      const layout = payload.layout;
      const element = layout.element;
      if (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"] || 
          this.scaleIcon.contains(p)) {
        yield* this.scaleImage(p, layout);
      } else {
        yield* this.translateImage(p, layout);
      }
    } else if (payload.padding) {
      yield* this.expandPadding(p, payload.padding);
    } else {
      if (
        keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"] ||
         this.expandHorizontalIcon.contains(p) ||this.expandVerticalIcon.contains(p)) {
        yield* this.expandBorder(p, payload.border);
      } else if (
        keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"] ||
        this.slantHorizontalIcon.contains(p) || this.slantVerticalIcon.contains(p)) {
        yield* this.slantBorder(p, payload.border);
      } else {
        yield* this.moveBorder(p, payload.border);
      }
    }
  }

  *scaleImage(p, layout) {
    const element = layout.element;
    const origin = element.scale[0];
    const size = layout.size;
    try {
      yield* scale(this.getPaperSize(), p, (q) => {
        const s = Math.max(q[0], q[1]);
        element.scale = [origin * s, origin * s];
        this.constraintLeaf(layout);
        this.redraw();
      });
    } catch (e) {
      if (e === "cancel") {
        this.onRevert();
      }
    }
  }

  *translateImage(p, layout) {
    const element = layout.element;
    const origin = element.translation;
    try {
      yield* translate(p, (q) => {
        element.translation = [origin[0] + q[0], origin[1] + q[1]];
        this.constraintLeaf(layout);
        this.redraw(); // TODO: できれば、移動した要素だけ再描画したい
      });
    } catch (e) {
      if (e === "cancel") {
        this.onRevert();
      }
    }
  }

  *moveBorder(p, border) {
    const layout = border.layout;
    const index = border.index;

    const child0 = layout.children[index - 1];
    const child1 = layout.children[index];

    const c0 = child0.element;
    const c1 = child1.element;
    const rawSpacing = c0.divider.spacing;
    const rawSum = c0.rawSize + rawSpacing + c1.rawSize;
    console.log(rawSpacing, rawSum);

    try {
      while ((p = yield)) {
        const balance = this.getBorderBalance(p, border);
        const t = balance * rawSum;
        c0.rawSize = t - rawSpacing * 0.5;
        c1.rawSize = rawSum - t - rawSpacing * 0.5;
        this.updateBorder(border);
        this.constraintRecursive(border.layout);
        this.redraw();
      }
    } catch (e) {
      if (e === 'cancel') {
        this.onRevert();
      }
    }
    this.onCommit(this.frameTree);
  }

  *expandBorder(p, border) {
    const element = border.layout.element;
    const dir = border.layout.dir == "h" ? 0 : 1;
    const factor = border.layout.size[dir] / this.getPaperSize()[dir];
    const prev = border.layout.children[border.index-1].element;
    const curr = border.layout.children[border.index].element;
    const startSpacing = prev.divider.spacing;
    const s = p;
    const startPrevRawSize = prev.rawSize;
    const startCurrRawSize = curr.rawSize;

    try {
      while ((p = yield)) {
        const op = p[dir] - s[dir];
        prev.divider.spacing = Math.max(0, startSpacing + op * factor * 0.1);
        const diff = prev.divider.spacing - startSpacing;
  
        prev.rawSize = startPrevRawSize - diff*0.5;
        curr.rawSize = startCurrRawSize - diff*0.5;
  
        element.calculateLengthAndBreadth();
        this.updateBorder(border);
        this.constraintRecursive(border.layout);
        this.redraw();
      }
    } catch (e) {
      if (e === 'cancel') {
        this.onRevert();
      }
    }

    this.onCommit(this.frameTree);
  }

  *slantBorder(p, border) {
    const element = border.layout.element;
    const dir = border.layout.dir == "h" ? 0 : 1;
    const prev = border.layout.children[border.index-1].element;
    const curr = border.layout.children[border.index].element;
    const rawSlant = prev.divider.slant;

    const s = p;
    try {
      while ((p = yield)) {
        const op = p[dir] - s[dir];
        prev.divider.slant = Math.max(-45, Math.min(45, rawSlant + op * 0.2));
        this.updateBorderTrapezoid(border);
        this.constraintRecursive(border.layout);
        this.redraw();
      }
    } catch (e) {
      if (e === 'cancel') {
        this.onRevert();
      }
    }

    this.onCommit(this.frameTree);
  }

  *expandPadding(p, padding) {
    const element = padding.layout.element;
    const dir = padding.handle === "top" || padding.handle === "bottom" ? 1 : 0;
    const deltaFactor = padding.handle === "right" || padding.handle === "bottom" ? -1 : 1;
    const rawSize = padding.layout.rawSize;
    const s = p;
    const initialPadding = element.padding[padding.handle] * rawSize[dir];

    try {
      while ((p = yield)) {
        const delta = p[dir] - s[dir];
        const currentPadding = initialPadding + delta * deltaFactor;
        element.padding[padding.handle] = currentPadding / rawSize[dir];
        this.updatePadding(padding);
        this.constraintTree(padding.layout);
        this.redraw();
      }
    } catch (e) {
      if (e === 'cancel') {
        this.revert();
      }
    }

    this.onCommit(this.frameTree);
  }

  getBorderBalance(p, border) {
    const layout = border.layout;
    const index = border.index;

    const child0 = layout.children[index - 1];
    const child1 = layout.children[index];

    const rect0 = rectFromPositionAndSize(child0.origin, child0.size);
    const rect1 = rectFromPositionAndSize(child1.origin, child1.size);

    let t; // 0.0 - 1.0, 0.0: top or left of rect0, 1.0: right or bottom of rect1
    if (layout.dir == "h") {
      t = 1.0 - (p[0] - rect1[0]) / (rect0[2] - rect1[0]);
    } else {
      t = (p[1] - rect0[1]) / (rect1[3] - rect0[1]);
    }
    return t;
  }

  constraintAll() {
    const layout = calculatePhysicalLayout(
      this.frameTree,
      this.getPaperSize(),
      [0, 0]
    );
    this.constraintRecursive(layout);
  }

  constraintTree(layout) {
    const newLayout = calculatePhysicalLayout(
      layout.element,
      layout.size,
      layout.origin
    );
    this.constraintRecursive(newLayout);
  }

  constraintRecursive(layout) {
    if (layout.children) {
      for (const child of layout.children) {
        this.constraintRecursive(child);
      }
    } else if (layout.element && layout.element.image) {
      this.constraintLeaf(layout);
    }
  }

  constraintLeaf(layout) {
    if (!layout.corners) {return; }
    if (!layout.element.image) { return; }
    const element = layout.element;
    const [x0, y0, x1, y1] = [
      Math.min(layout.corners.topLeft[0], layout.corners.bottomLeft[0]),
      Math.min(layout.corners.topLeft[1], layout.corners.topRight[1]),
      Math.max(layout.corners.topRight[0], layout.corners.bottomRight[0]),
      Math.max(layout.corners.bottomLeft[1], layout.corners.bottomRight[1]),
    ]
    const [w, h] = [x1 - x0, y1 - y0];

    let scale = element.scale[0];
    if (element.image.width * scale < w) {
      scale = w / element.image.width;
    }
    if (element.image.height * scale < h) {
      scale = h / element.image.height;
    }
    element.scale = [scale, scale];

    const [rw, rh] = [
      element.image.width * scale,
      element.image.height * scale,
    ];
    const x = (x0 + x1) * 0.5 + element.translation[0];
    const y = (y0 + y1) * 0.5 + element.translation[1];

    if (x0 < x - rw / 2) {
      element.translation[0] = - (w - rw) / 2;
    }
    if (x + rw / 2 < x1) {
      element.translation[0] = (w - rw) / 2;
    }
    if (y0 < y - rh / 2) {
      element.translation[1] = - (h - rh) / 2;
    }
    if (y1 > y + rh / 2) {
      element.translation[1] = (h - rh) / 2;
    }

  }

  importImage(layoutlet, image) {
    const size = [image.width, image.height];
    // calc expansion to longer size
    const scale = Math.max(
      layoutlet.size[0] / size[0],
      layoutlet.size[1] / size[1]
    );

    layoutlet.element.translation = [0, 0];
    layoutlet.element.scale = [scale, scale];
    layoutlet.element.image = image;
    this.constraintLeaf(layoutlet);
    this.redraw();
  }

  hintIfContains(p, a) {
    for (let e of a) {
      if (e.hintIfContains(p, this.hint)) {
        return true;
      }
    }
    return false;
  }

  updatePadding(padding) {
    const rootLayout = calculatePhysicalLayout(this.frameTree,this.getPaperSize(),[0, 0]);
    const newLayout = findLayoutOf(rootLayout, padding.layout.element);
    padding.layout = newLayout;
    this.updatePaddingTrapezoid(padding);
  }

  updatePaddingTrapezoid(padding) {
    const pt = makePaddingTrapezoid(padding.layout, padding.handle);
    padding.trapezoid = pt;
  }

  updateBorder(border) {
    const rootLayout = calculatePhysicalLayout(this.frameTree,this.getPaperSize(),[0, 0]);
    const newLayout = findLayoutOf(rootLayout, border.layout.element);
    border.layout = newLayout;
    this.updateBorderTrapezoid(border);
  }

  updateBorderTrapezoid(border) {
    const bt = makeBorderTrapezoid(border.layout, border.index);
    border.trapezoid = bt;
    this.updateBorderIconPositions(border);
  }

  updateBorderIconPositions(border) {
    const bt = border.trapezoid;
    this.slantVerticalIcon.position = [bt.topLeft[0],(bt.topLeft[1] + bt.bottomLeft[1]) * 0.5 - 16];
    this.expandVerticalIcon.position = [bt.topRight[0] - 32,(bt.topRight[1] + bt.bottomRight[1]) * 0.5 - 16];
    this.slantHorizontalIcon.position = [(bt.topLeft[0] + bt.topRight[0]) * 0.5 - 16,bt.topLeft[1]];
    this.expandHorizontalIcon.position = [(bt.bottomLeft[0] + bt.bottomRight[0]) * 0.5 - 16,bt.bottomLeft[1] - 32];
  }

  beforeDoubleClick(p) {
    for (let e of this.frameIcons) {
      if (e.contains(p)) {
        return true;
      }
    }
    for (let e of this.borderIcons) {
      if (e.contains(p)) {
        return true;
      }
    }
    return false;
  }

}
