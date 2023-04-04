import { Layer } from "./layeredCanvas.js";
import { FrameElement, calculatePhysicalLayout, findLayoutAt, findLayoutOf, findBorderAt, findMarginAt, findPaddingAt, makeBorderTrapezoid, makeMarginRect, makePaddingRect, rectFromPositionAndSize } from "./frameTree.js";
import { translate, scale } from "./pictureControl.js";
import { keyDownFlags } from "./keyCache.js";
import { ClickableIcon } from "./clickableIcon.js";
import { cssColorToRgba, rgbaToCssColor } from "./canvasTools.js";

export class FrameLayer extends Layer {
  constructor(frameTree, interactable, onCommit) {
    super();
    this.frameTree = frameTree;
    this.interactable = interactable;
    this.onCommit = onCommit;

    this.splitHorizontalIcon = new ClickableIcon("split-horizontal.png",[0, 0],[32, 32], "横に分割", () => this.interactable && this.focusedLayout && !this.pointerHandler);
    this.splitVerticalIcon = new ClickableIcon("split-vertical.png",[0, 0],[32, 32], "縦に分割", () => this.interactable && this.focusedLayout && !this.pointerHandler);
    this.deleteIcon = new ClickableIcon("delete.png", [0, 0], [32, 32], "削除", () => this.interactable && this.focusedLayout && !this.pointerHandler);
    this.zplusIcon = new ClickableIcon("zplus.png", [0, 0], [32, 32], "手前に", () => this.interactable && this.focusedLayout && !this.pointerHandler);
    this.zminusIcon = new ClickableIcon("zminus.png", [0, 0], [32, 32], "奥に", () => this.interactable && this.focusedLayout && !this.pointerHandler);

    this.scaleIcon = new ClickableIcon("scale.png", [0, 0], [32, 32], "スケール", () => this.interactable && this.focusedLayout);
    this.dropIcon = new ClickableIcon("drop.png", [0, 0], [32, 32], "画像除去", () => this.interactable && this.focusedLayout && !this.pointerHandler);
    this.flipHorizontalIcon = new ClickableIcon("flip-horizontal.png", [0, 0], [32, 32], "左右反転", () => this.interactable && this.focusedLayout?.element.image && !this.pointerHandler);
    this.flipVerticalIcon = new ClickableIcon("flip-vertical.png", [0, 0], [32, 32], "上下反転", () => this.interactable && this.focusedLayout?.element.image && !this.pointerHandler);

    this.expandHorizontalIcon = new ClickableIcon("expand-horizontal.png",[0, 0],[32, 32], "幅を変更", () => this.interactable && this.focusedBorder?.layout.dir === 'h');
    this.slantHorizontalIcon = new ClickableIcon("slant-horizontal.png", [0, 0], [32, 32], "傾き", () => this.interactable && this.focusedBorder?.layout.dir === 'h');
    this.expandVerticalIcon = new ClickableIcon("expand-vertical.png",[0, 0],[32, 32], "幅を変更", () => this.interactable && this.focusedBorder?.layout.dir === 'v');
    this.slantVerticalIcon = new ClickableIcon("slant-vertical.png", [0, 0], [32, 32], "傾き", () => this.interactable && this.focusedBorder?.layout.dir === 'v');

    this.transparentPattern = new Image();
    this.transparentPattern.src = new URL("../../assets/transparent.png",import.meta.url).href;
  }

  render(ctx) {
    const size = this.getCanvasSize();

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

    if (this.focusedMargin) {
      const newLayout = findLayoutOf(layout, this.focusedMargin.layout.element);
      const marginRect = makeMarginRect(newLayout, this.focusedMargin.handle);

      ctx.fillStyle = "rgba(0,0,200,0.7)";
      ctx.fillRect(marginRect[0],marginRect[1],marginRect[2] - marginRect[0],marginRect[3] - marginRect[1]);
    }

    if (this.focusedLayout) {
      ctx.font = '24px serif';
      ctx.fillStyle = "#86C8FF";
      const l = this.focusedLayout;
      ctx.fillText(l.element.z, l.origin[0]+32, l.origin[1]+28);
    }

    if (this.focusedPadding) {
      const newLayout = findLayoutOf(layout, this.focusedPadding.layout.element);
      const paddingRect = makePaddingRect(newLayout, this.focusedPadding.handle);

      ctx.fillStyle = "rgba(200,200,0, 0.7)";
      ctx.fillRect(paddingRect[0],paddingRect[1],paddingRect[2] - paddingRect[0],paddingRect[3] - paddingRect[1]);
    }

    if (this.focusedBorder) {
      ctx.fillStyle = "rgba(0,200,200,0.7)";
      ctx.beginPath();
      this.trapezoidPath(ctx, this.focusedBorder.trapezoid);
      ctx.fill();
    }
      
    this.slantVerticalIcon.render(ctx);
    this.expandVerticalIcon.render(ctx);
    this.slantHorizontalIcon.render(ctx);
    this.expandHorizontalIcon.render(ctx);
    this.splitHorizontalIcon.render(ctx);
    this.splitVerticalIcon.render(ctx);
    this.deleteIcon.render(ctx);
    this.zplusIcon.render(ctx);
    this.zminusIcon.render(ctx);
    this.scaleIcon.render(ctx);
    this.dropIcon.render(ctx);
    this.flipHorizontalIcon.render(ctx);
    this.flipVerticalIcon.render(ctx);
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
    if (element.image) {
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

    const borderWidth = inheritanceContext.borderWidth;
    if (0 < borderWidth) {
      ctx.strokeStyle = inheritanceContext.borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }

    // 選択枠描画
    const p = layout.element.padding;
    if (0 != p.top || 0 != p.right || 0 != p.bottom || 0 != p.left) {
      ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
      ctx.strokeRect(...layout.rawOrigin, ...layout.rawSize);
    }
  }

  renderBackground(ctx, layout, inheritanceContext) {
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
      this.getCanvasSize(),
      [0, 0]
    );
    let layoutlet = findLayoutAt(layout, position);
    if (layoutlet) {
      this.importImage(layoutlet, image);
      return true;
    }
    return false;
  }

  pointerHover(point) {
    if (keyDownFlags["Space"]) { return; }

    const layout = calculatePhysicalLayout(
      this.frameTree,
      this.getCanvasSize(),
      [0, 0]
    );

    this.focusedMargin = null;
    this.focusedPadding = null;
    this.focusedBorder = null;
    this.focusedLayout = null;

    if (keyDownFlags["KeyR"]) {
      this.focusedMargin = findMarginAt(layout, point);
      if (this.focusedMargin) {
        this.redraw();
        this.hint(point, null);
        return;
      }
    }

    if (keyDownFlags["KeyB"]) {
      this.focusedPadding = findPaddingAt(layout, point);
      if (this.focusedPadding) {
        this.redraw();
        this.hint(point, null);
        return;
      }
    }

    const border = findBorderAt(layout, point);
    if (border) {
      this.focusedBorder = border;
      this.updateBorderIconPositions(border);
      this.redraw();

      if (!this.hintIfContains(point, [this.slantVerticalIcon, this.expandVerticalIcon, this.slantHorizontalIcon, this.expandHorizontalIcon])) {
        this.hint(point, null);
      }
      return;
    } 

    this.focusedLayout = findLayoutAt(layout, point);
    if (this.focusedLayout) {
      const origin = this.focusedLayout.origin;
      const size = this.focusedLayout.size;
      const [x, y] = [origin[0] + size[0] / 2, origin[1] + size[1] / 2];
      this.splitHorizontalIcon.position = [x + 32, y];
      this.splitVerticalIcon.position = [x, y + 32];
      this.deleteIcon.position = [origin[0] + size[0] - 32, origin[1]];
      this.zplusIcon.position = [origin[0] + 48, origin[1]];
      this.zminusIcon.position = [origin[0], origin[1]];
      this.scaleIcon.position = [origin[0] + size[0] - 32, origin[1] + size[1] - 32];
      this.dropIcon.position = [origin[0], origin[1] + size[1] - 32];
      this.flipHorizontalIcon.position = [origin[0] + 48, origin[1] + size[1] - 32];
      this.flipVerticalIcon.position = [origin[0] + 72, origin[1] + size[1] - 32,];
      this.redraw();

      if (this.hintIfContains(point, [this.splitHorizontalIcon, this.splitVerticalIcon, this.deleteIcon, this.zplusIcon, this.zminusIcon, this.scaleIcon, this.dropIcon, this.flipHorizontalIcon, this.flipVerticalIcon])) {
      } else if (this.focusedLayout.element.image) {
        this.hint([x, origin[1] + 16],"ドラッグで移動、Ctrl+ドラッグでスケール");
      } else {
        this.hint([x, origin[1] + 16], "画像をドロップ");
      }
      return;
    }
    this.hint(point, null);
  }

  accepts(point) {
    if (!this.interactable) {
      return null;
    }

    if (keyDownFlags["Space"]) {
      return null;
    }

    const layout = calculatePhysicalLayout(
      this.frameTree,
      this.getCanvasSize(),
      [0, 0]
    );

    if (keyDownFlags["KeyR"]) {
      const margin = findMarginAt(layout, point);
      if (margin) {
        return { margin };
      }
    }

    if (keyDownFlags["KeyB"]) {
      const padding = findPaddingAt(layout, point);
      if (padding) {
        return { padding };
      }
    }

    const border = findBorderAt(layout, point);
    this.focusedBorder = border;
    if (border) {
      return { border };
    }

    const layoutElement = findLayoutAt(layout, point);
    if (layoutElement) {
      if (keyDownFlags["KeyQ"]) {
        FrameElement.eraseElement(this.frameTree, layoutElement.element);
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.redraw();
      }
      if (keyDownFlags["KeyW"]) {
        FrameElement.splitElementHorizontal(
          this.frameTree,
          layoutElement.element
        );
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.redraw();
      }
      if (keyDownFlags["KeyS"]) {
        FrameElement.splitElementVertical(
          this.frameTree,
          layoutElement.element
        );
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.redraw();
      }
      if (keyDownFlags["KeyD"]) {
        layoutElement.element.image = null;
        this.redraw();
      }
      if (keyDownFlags["KeyT"]) {
        layoutElement.element.reverse[0] *= -1;
        this.redraw();
      }
      if (keyDownFlags["KeyY"]) {
        layoutElement.element.reverse[1] *= -1;
        this.redraw();
      }
      if (this.splitHorizontalIcon.contains(point)) {
        FrameElement.splitElementHorizontal(
          this.frameTree,
          layoutElement.element
        );
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.focusedLayout = null;
        this.redraw();
      }
      if (this.splitVerticalIcon.contains(point)) {
        FrameElement.splitElementVertical(
          this.frameTree,
          layoutElement.element
        );
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.focusedLayout = null;
        this.redraw();
      }
      if (this.deleteIcon.contains(point)) {
        FrameElement.eraseElement(this.frameTree, layoutElement.element);
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.focusedLayout = null;
        this.redraw();
      }
      if (this.zplusIcon.contains(point)) {
        layoutElement.element.z += 1;
        this.onCommit(this.frameTree);
        this.redraw();
      }
      if (this.zminusIcon.contains(point)) {
        layoutElement.element.z -= 1;
        this.onCommit(this.frameTree);
        this.redraw();
      }

      if (this.dropIcon.contains(point)) {
        layoutElement.element.image = null;
        this.redraw();
      } else if (this.flipHorizontalIcon.contains(point)) {
        layoutElement.element.reverse[0] *= -1;
        this.redraw();
      } else if (this.flipVerticalIcon.contains(point)) {
        layoutElement.element.reverse[1] *= -1;
        this.redraw();
      } else {
        return { layout: layoutElement };
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
        const origin = element.scale[0];
        const size = layout.size;
        yield* scale(this.canvas, p, (q) => {
          const s = Math.max(q[0], q[1]);
          element.scale = [origin * s, origin * s];
          this.constraintLeaf(layout);
          this.redraw(); // TODO: できれば、移動した要素だけ再描画したい
        });
      } else {
        const origin = element.translation;
        yield* translate(p, (q) => {
          element.translation = [origin[0] + q[0], origin[1] + q[1]];
          this.constraintLeaf(layout);
          this.redraw(); // TODO: できれば、移動した要素だけ再描画したい
        });
      }
    } else if (payload.margin) {
      yield* this.expandMargin(p, payload.margin);
    } else if (payload.padding) {
      yield* this.expandPadding(p, payload.padding);
    } else {
      if (
        keyDownFlags["ControlLeft"] ||
        keyDownFlags["ControlRight"] ||
        this.expandHorizontalIcon.contains(p) ||
        this.expandVerticalIcon.contains(p)
      ) {
        yield* this.expandBorder(p, payload.border);
      } else if (
        keyDownFlags["ShiftLeft"] ||
        keyDownFlags["ShiftRight"] ||
        this.slantHorizontalIcon.contains(p) ||
        this.slantVerticalIcon.contains(p)
      ) {
        yield* this.slantBorder(p, payload.border);
      } else {
        yield* this.moveBorder(p, payload.border);
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
    const rawSpacing = layout.element.divider.spacing;
    const rawSum = c0.rawSize + rawSpacing + c1.rawSize;

    while ((p = yield)) {
      const balance = this.getBorderBalance(p, border);
      const t = balance * rawSum;
      c0.rawSize = t - rawSpacing * 0.5;
      c1.rawSize = rawSum - t - rawSpacing * 0.5;
      this.updateBorder(border);
      this.constraintRecursive(border.layout);
      this.redraw();
    }

    this.onCommit(this.frameTree);
  }

  *expandBorder(p, border) {
    const element = border.layout.element;
    const rawSpacing = element.divider.spacing;
    const dir = border.layout.dir == "h" ? 0 : 1;
    const factor = border.layout.size[dir] / this.getCanvasSize()[dir];
    const s = p;

    while ((p = yield)) {
      const op = p[dir] - s[dir];
      element.divider.spacing = Math.max(0, rawSpacing + op * factor * 0.1);
      element.calculateLengthAndBreadth();
      this.updateBorder(border);
      this.constraintRecursive(border.layout);
      this.redraw();
    }

    this.onCommit(this.frameTree);
  }

  *slantBorder(p, border) {
    const element = border.layout.element;
    const rawSlant = element.divider.slant;
    const dir = border.layout.dir == "h" ? 0 : 1;

    const s = p;
    while ((p = yield)) {
      const op = p[dir] - s[dir];
      element.divider.slant = Math.max(-45, Math.min(45, rawSlant + op * 0.2));
      this.updateBorderTrapezoid(border);
      this.constraintRecursive(border.layout);
      this.redraw();
    }

    this.onCommit(this.frameTree);
  }

  *expandMargin(p, margin) {
    const element = margin.layout.element;
    const dir = margin.handle === "top" || margin.handle === "bottom" ? 1 : 0;
    const physicalSize = margin.layout.size[dir];
    const logicalSize = element.getLogicalSize()[dir];
    const factor = logicalSize / physicalSize;
    const s = p;

    const oldLogicalMargin = element.margin[margin.handle];

    while ((p = yield)) {
      let physicalMarginDelta = p[dir] - s[dir];
      if (margin.handle === "bottom" || margin.handle === "right") { physicalMarginDelta = -physicalMarginDelta; }
      // 比率なのでだんだん乖離していくが、一旦そのまま
      element.margin[margin.handle] = Math.max(0, oldLogicalMargin + physicalMarginDelta * factor);
      element.calculateLengthAndBreadth();
      this.constraintTree(margin.layout);
      this.redraw();
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

    while ((p = yield)) {
      const delta = p[dir] - s[dir];
      const currentPadding = initialPadding + delta * deltaFactor;
      element.padding[padding.handle] = currentPadding / rawSize[dir];
      this.constraintTree(padding.layout);
      this.redraw();
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
      t = (p[0] - rect0[0]) / (rect1[2] - rect0[0]);
    } else {
      t = (p[1] - rect0[1]) / (rect1[3] - rect0[1]);
    }
    return t;
  }

  constraintAll() {
    const layout = calculatePhysicalLayout(
      this.frameTree,
      this.getCanvasSize(),
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

  updateBorder(border) {
    const rootLayout = calculatePhysicalLayout(this.frameTree,this.getCanvasSize(),[0, 0]);
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

}
