import { finder } from "@medv/finder";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

let isActive = false;
let activeEl: Element | null; // 当前选择的元素
let removeEventsFn: () => void | null;

function init() {
  // 防止重复初始化
  if (document.getElementById("easy_selector_toolbar")) {
    return;
  }
  injectHtml(); // 向页面注入html代码
  removeEventsFn = documentBindEvents(); // 给根元素绑定事件

  const maskEl = document.getElementById("easy_selector_mask");
  // 给指示器按钮绑定点击事件
  document.getElementById("get_ele_selector_btn")?.addEventListener<"click">(
    "click",
    function () {
      if (!maskEl) return;
      if (!isActive) {
        isActive = true;
        maskEl.style.display = "block";
        maskEl.style.pointerEvents = "none";
        this.classList.add("is-use");
      } else {
        isActive = false;
        maskEl.style.display = "none";
        maskEl.style.pointerEvents = "auto";
        maskEl.style.top = "-100%";
        maskEl.style.left = "-100%";
        this.classList.remove("is-use");
      }
    },
    false
  );
}

/**
 * 给document绑定事件
 * @returns {(function(): void)|*}
 */
function documentBindEvents() {
  let maskEl = document.getElementById("easy_selector_mask");
  let toolbarEl = document.getElementById("easy_selector_toolbar");
  let getEleSelectorBtn = toolbarEl?.querySelector(".get-ele-selector");
  let isMouseDown = false;
  let mouseDownTime = 0;
  let elLeftWithMouseX = 0; // 鼠标x坐标点距离元素左边的距离
  let elTopWithMouseY = 0;

  const mouseDownFn = (e: MouseEvent) => {
    if (elementContains(toolbarEl, e.target) && !isActive && toolbarEl) {
      const elRect = toolbarEl.getBoundingClientRect();
      elLeftWithMouseX = e.pageX - elRect.left;
      elTopWithMouseY = e.pageY - elRect.top;
      isMouseDown = true;
      mouseDownTime = new Date().getTime();
      return;
    }
    if (!isActive || !maskEl || !activeEl) {
      return;
    }

    // 设置高亮选中节点的元素的pointerEvents为auto，以达到禁用选中节点的点击事件效果
    maskEl.style.pointerEvents = "auto";
    isActive = false;
    console.log("activeEl", activeEl);

    const selector = finder(activeEl, {
      // root: document.documentElement,
      className: (name) => {
        return !name.startsWith("is-");
      },
      tagName: () => true,
      seedMinLength: 10,
      optimizedMinLength: 15,
    });
    showPopper(activeEl, selector);

    const timer = setTimeout(() => {
      clearTimeout(timer);
      if (!maskEl || !getEleSelectorBtn) {
        return;
      }
      maskEl.style.display = "none";
      maskEl.style.pointerEvents = "none";
      maskEl.style.top = "-100%";
      maskEl.style.left = "-100%";
      getEleSelectorBtn.classList.remove("is-use");
    }, 220);
  };
  const mouseMoveFn = (e: MouseEvent) => {
    const target = (e || window.event).target as Element;
    // 移动工具栏
    if (!isActive && isMouseDown) {
      moveToolBar(e);
      return;
    }

    if (!target || !maskEl) return;
    if (
      !isActive ||
      target === activeEl ||
      elementContains(toolbarEl, target)
    ) {
      return;
    }
    const targetRect = target.getBoundingClientRect();
    activeEl = target;
    maskEl.style.width = targetRect.width + "px";
    maskEl.style.height = targetRect.height + "px";
    maskEl.style.top = targetRect.top + "px";
    maskEl.style.left = targetRect.left + "px";
  };

  const mouseUpFn = (e: MouseEvent) => {
    isMouseDown = false;
    if (!toolbarEl) return;
    if (new Date().getTime() - mouseDownTime > 300) {
      // 防止按钮点击事件不可用
      if (elementContains(toolbarEl, e.target)) {
        const btns = Array.from(toolbarEl.querySelectorAll("button"));
        getEleSelectorBtn?.classList.remove("is-use");
        // 将按钮都禁用掉，以免触发按钮的click事件，随后将其恢复可用
        btns.forEach(function (btn) {
          if (!btn.hasAttribute("disabled")) {
            btn.setAttribute("temporary-disabled", "true");
            btn.setAttribute("disabled", "disabled");
          }
        });

        const timer = setTimeout(() => {
          clearTimeout(timer);
          btns.forEach((btn) => {
            if (btn.hasAttribute("temporary-disabled")) {
              btn.removeAttribute("disabled");
              btn.removeAttribute("temporary-disabled");
              btn.disabled = false;
            }
          });
        }, 100);
      }
    }
  };
  // 移动工具栏
  const moveToolBar = (e: MouseEvent) => {
    const mouseX = e.pageX;
    const mouseY = e.pageY;
    e.preventDefault();
    if (toolbarEl) {
      toolbarEl.style.left = mouseX - elLeftWithMouseX + "px";
      toolbarEl.style.top = mouseY - elTopWithMouseY + "px";
    }
  };

  // 给根元素绑定mousemove事件
  document.addEventListener<"mousemove">("mousemove", mouseMoveFn, false);
  // 给根节点绑定mousedown事件
  document.addEventListener<"mousedown">("mousedown", mouseDownFn, false);
  // 给根节点绑定mouseup事件
  document.addEventListener<"mouseup">("mouseup", mouseUpFn, false);

  // 移除事件
  return function () {
    document.removeEventListener("mousemove", mouseMoveFn, false);
    document.removeEventListener("mousedown", mouseDownFn, false);
    document.removeEventListener("mouseup", mouseUpFn, false);
    maskEl = toolbarEl = getEleSelectorBtn = null;
  };
}

function destroy() {
  if (!removeEventsFn) {
    return;
  }
  removeEventsFn();
  document.body.removeChild(document.getElementById("easy_selector_mask")!);
  document.body.removeChild(document.getElementById("easy_selector_toolbar")!);
  isActive = false;
  activeEl = null;
}

/**
 * 显示气泡弹窗
 * @param targetEl 目标元素
 * @param content 内容
 */
function showPopper(targetEl: Element, content: string) {
  const tipIns = tippy(targetEl, {
    content: content,
    trigger: "click",
    animation: "shift-away",
    arrow: true,
    interactive: true,
    allowHTML: true,
    // maxWidth: 650,
    appendTo: document.body,
    onCreate(ins) {
      console.log("ins", ins);
      const popperEl = ins.popper;
      popperEl.className = popperEl.className + " easy-selector-popper";
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tippyContent = popperEl.querySelector(".tippy-content")!;
      tippyContent.addEventListener(
        "dblclick",
        function (e) {
          e.preventDefault();
          copy(content);
          showMessage("CSS Selector复制成功！");
          ins.hide();
        },
        false
      );
    },
    onHidden(ins) {
      ins.destroy();
    },
  });
  // 防止火狐浏览器第一次时气泡弹窗显示不了
  const timer = setTimeout(function () {
    clearTimeout(timer);
    tipIns.show();
  }, 0);
}

/**
 * 向页面插入dom
 */
function injectHtml() {
  const html = `
        <div class="easy-selector-mask" id="easy_selector_mask"></div>
        <ul class="easy-selector-toolbar" id="easy_selector_toolbar">
          <li class="easy-selector-fun">
            <button type="button" id="get_ele_selector_btn" class="get-ele-selector" title="点击即可拾取元素CSS选择器">
              <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6069" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><style type="text/css"></style></defs><path d="M281.6 137.813333a128 128 0 0 0-128 128v469.333334a128 128 0 0 0 128 128h213.333333a42.666667 42.666667 0 1 0 0-85.333334h-213.333333a42.666667 42.666667 0 0 1-42.666667-42.666666v-469.333334a42.666667 42.666667 0 0 1 42.666667-42.666666h469.333333a42.666667 42.666667 0 0 1 42.666667 42.666666v213.333334a42.666667 42.666667 0 1 0 85.333333 0v-213.333334a128 128 0 0 0-128-128h-469.333333z m294.613333 380.544l42.154667 365.184a21.333333 21.333333 0 0 0 38.357333 10.24l80.213334-108.629333 114.048 169.941333a42.666667 42.666667 0 1 0 70.826666-47.573333l-114.048-169.941333 124.416-36.693334a21.333333 21.333333 0 0 0 3.498667-39.552l-328.746667-164.522666a21.333333 21.333333 0 0 0-30.72 21.546666z" p-id="6070"></path></svg>
            </button>
          </li>
        </ul>`;
  const temp = document.createElement("div");
  temp.innerHTML = html;
  document.body.appendChild(temp);
}

/**
 * 显示消息
 * @param msg 消息
 */
function showMessage(msg: string) {
  const msgEl = document.createElement("div");
  msgEl.className = "easy-selector-message enter";
  msgEl.innerHTML = msg;
  document.body.appendChild(msgEl);
  const timer = setTimeout(function () {
    clearTimeout(timer);
    msgEl.className = "easy-selector-message";
    msgEl.style.top = "10px";
  }, 250);
  const timer2 = setTimeout(function () {
    clearTimeout(timer2);
    document.body.removeChild(msgEl);
  }, 2500);
}

/**
 * 复制内容到剪切板
 * @param content 需复制的内容
 */
function copy(content: string) {
  const input = document.createElement("input");
  input.style.position = "absolute";
  input.style.left = "-9999px";
  input.value = content;
  document.body.appendChild(input);
  input.select();
  // 将内容复制到剪切板
  document.execCommand("copy");
  document.body.removeChild(input);
}
/**
 * 判断两个元素是否是包含关系
 * @param parentEl 父元素
 * @param childEle 子元素
 * @returns {Boolean}
 */
function elementContains(parentEl: any, childEle: any) {
  if (parentEl === childEle) {
    return false;
  }
  if (typeof parentEl.contains === "function") {
    return parentEl.contains(childEle);
  } else {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (!childEle) {
        return false;
      }
      if (childEle === parentEl) {
        return true;
      } else {
        childEle = childEle.parentNode;
      }
    }
    return false;
  }
}

init();

export default {
  init,
  destroy,
};
