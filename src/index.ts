import { finder, Options } from "@medv/finder";
import mitt from "mitt";

export interface SelectorOptions {
  maskStyle?: { [key: string]: string | number };
  finderOptions: Options;
}

export enum SelectEvents {
  SELECT = "select",
  MOVE = "move",
}

export type SelectorApi = {
  enable(): void;
  disable(): void;
  destroy(): void;
};

export class CssSelector implements SelectorApi {
  [x: string]: any;

  private activeEl: Element | null = null;

  private _disable = false;

  private removeEventsFn: (() => void) | undefined;

  private mask!: HTMLDivElement;

  static createSelector(options: SelectorOptions) {
    return new CssSelector(options);
  }

  constructor(config: SelectorOptions) {
    this.init(config);
  }

  private init(options: SelectorOptions) {
    if (this.mask) return;
    this.mask = this.createMask(options?.maskStyle);
    document.body.appendChild(this.mask);
    this.removeEventsFn = this.documentBindEvents(options?.finderOptions); // 给根元素绑定事件
    const emitter = mitt();
    Object.assign(this, emitter);
  }

  enable() {
    const { mask } = this;
    mask.style.display = "block";
    mask.style.pointerEvents = "none";
    this._disable = false;
  }

  disable() {
    const { mask } = this;
    mask.style.display = "none";
    mask.style.pointerEvents = "none";
    mask.style.top = "-100%";
    mask.style.left = "-100%";
    this._disable = true;
  }

  destroy() {
    this.removeEventsFn && this.removeEventsFn();
    this.activeEl = null;
    this._disable = false;
    document.body.removeChild(this.mask);
  }

  private documentBindEvents(options: Options) {
    const { mask } = this;
    const defaultFinderOptions = {
      className: (name: string) => {
        return !name.startsWith("is-");
      },
      tagName: () => true,
      seedMinLength: 10,
      optimizedMinLength: 15,
    };
    const finderOptions = Object.assign(defaultFinderOptions, options);
    const mouseDownFn = () => {
      const { activeEl, _disable } = this;
      if (!activeEl || _disable) {
        return;
      }

      // 设置高亮选中节点的元素的pointerEvents为auto，以达到禁用选中节点的点击事件效果
      mask.style.pointerEvents = "auto";
      const selector = finder(activeEl, finderOptions);
      this.emit(SelectEvents.SELECT, { selector, activeEl });
      const timer = setTimeout(() => {
        clearTimeout(timer);
        if (!mask) {
          return;
        }
        this.disable();
      }, 220);
    };
    const mouseMoveFn = (e: MouseEvent) => {
      const target = (e || window.event).target as Element;
      if (!target || this._disable) return;
      if (target === this.activeEl) {
        return;
      }
      const targetRect = target.getBoundingClientRect();
      this.activeEl = target;
      this.emit(SelectEvents.MOVE, { targetRect, activeEl: target });
      mask.style.width = targetRect.width + "px";
      mask.style.height = targetRect.height + "px";
      mask.style.top = targetRect.top + "px";
      mask.style.left = targetRect.left + "px";
    };

    // 给根元素绑定mousemove事件
    document.addEventListener<"mousemove">("mousemove", mouseMoveFn, false);
    // 给根节点绑定mousedown事件
    document.addEventListener<"mousedown">("mousedown", mouseDownFn, false);

    // 移除事件
    return () => {
      document.removeEventListener("mousemove", mouseMoveFn, false);
      document.removeEventListener("mousedown", mouseDownFn, false);
    };
  }

  private createMask(style: { [key: string]: string | number } = {}) {
    const maskContainer = document.createElement("div");
    const defaultStyle: Record<string, string | number> = {
      position: "fixed",
      zIndex: 9999,
      pointerEvents: "none" /* 让事件可穿透 */,
      backgroundColor: "rgba(64,158,255, 0.5)",
    };
    const margeStyle = { ...defaultStyle, ...style };
    Object.keys(margeStyle).forEach((key) => {
      maskContainer.style.setProperty(toLine(key), margeStyle[key] + "");
    });
    return maskContainer;
  }
}

const toLine = (name: string) => name.replace(/([A-Z])/g, "-$1").toLowerCase();
