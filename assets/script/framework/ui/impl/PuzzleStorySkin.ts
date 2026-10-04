import { BlockInputEvents, Button, Color, Graphics, Node, UITransform, view } from 'cc';
import {
  IUISkin,
  UIButtonOptions,
  UIButtonVariant,
  UIPanelOptions,
  UISkinPalette,
  UITextOptions,
  UIWindowHandle,
} from '../IUISkin';
import { UIHelper } from '../UIHelper';

// 参考《天天拼拼图》风格的暖色故事书皮肤实现
// 全部使用 Graphics 代码绘制矢量图，无需外部图片资源就能呈现手绘童话质感
export class PuzzleStorySkin implements IUISkin {
  // 故事书主题的基础调色板（羊皮纸暖色调 + 深褐复古墨水）
  readonly palette: UISkinPalette = {
    white: new Color(255, 255, 255, 255),
    ink: new Color(82, 48, 28, 255),
    cream: new Color(255, 247, 222, 250),
    paper: new Color(255, 245, 215, 252),
    line: new Color(151, 91, 45, 255),
    mutedText: new Color(135, 83, 45, 255),
  };

  // 创建文本节点（默认走故事书专用的墨水深褐色与 22 号字体）
  createText(name: string, text: string, options: UITextOptions = {}) {
    return UIHelper.createText(
      name,
      text,
      options.fontSize ?? 22,
      options.color ?? this.palette.ink,
      options.bold ?? false,
      // 开启描边时加上微透明的黑褐色描边，让字迹更清晰
      options.outline ? { color: new Color(0, 0, 0, 170), width: 2 } : undefined,
    );
  }

  // 拼装一个带手绘立体感的交互按钮
  createButton(name: string, text: string, options: UIButtonOptions = {}) {
    const width = options.width ?? 220;
    const height = options.height ?? 60;
    const variant = options.variant ?? 'primary';
    const colors = this.buttonColors(variant);
    const node = new Node(name);

    // 1. 绘制底层圆角底板与外边框
    UIHelper.drawRoundedSurface(node, width, height, colors.fill, Math.min(18, height * 0.32), colors.line);
    // 2. 叠加上半部分的高光和两侧装饰小铆钉
    this.decorateButton(node, width, height, colors.line);

    // 3. 挂载 Button 组件并配置微缩放的点击按压反馈
    const button = node.addComponent(Button);
    button.transition = Button.Transition.SCALE;
    button.zoomScale = 0.96;
    if (options.onClick) {
      node.on(Button.EventType.CLICK, options.onClick);
    }

    // 4. 居中挂载按钮文本
    node.addChild(this.createText(`${name}_Label`, text, {
      fontSize: options.fontSize ?? 22,
      color: options.color ?? colors.text,
      bold: options.bold ?? true,
      outline: options.outline,
    }));
    return node;
  }

  // 创建故事书风格面板（外层圆角底板 + 内嵌细金线框 + 四角手绘铆钉）
  createPanel(name: string, options: UIPanelOptions) {
    const width = options.width;
    const height = options.height;
    const node = new Node(name);
    const radius = options.radius ?? 24;

    // 先画主底板
    const graphics = UIHelper.drawRoundedSurface(node, width, height, this.palette.paper, radius, this.palette.line);

    // 再往里缩进 9 像素画一圈内边框金色细线，营造羊皮纸边缘内嵌感
    graphics.strokeColor = new Color(207, 151, 78, 190);
    graphics.lineWidth = 2;
    graphics.roundRect(-width / 2 + 9, -height / 2 + 9, width - 18, height - 18, Math.max(7, radius - 7));
    graphics.stroke();

    // 面板四角加上手绘金属铆钉点缀
    this.decoratePanel(node, width, height, this.palette.line);
    return node;
  }

  // 创建居中弹窗：带全屏半透明黑色遮罩 + 拦截下层触摸 + 居中面板，并返回控制器
  createWindow(parent: Node, name: string, options: UIPanelOptions): UIWindowHandle {
    const size = view.getVisibleSize();

    // 1. 创建全屏黑色半透明遮罩
    const overlay = new Node(`${name}Overlay`);
    overlay.addComponent(UITransform).setContentSize(size.width, size.height);
    const shade = overlay.addComponent(Graphics);
    shade.fillColor = new Color(24, 21, 28, 148);
    shade.rect(-size.width / 2, -size.height / 2, size.width, size.height);
    shade.fill();

    // 拦截点击事件防止穿透到下层界面
    overlay.addComponent(BlockInputEvents);
    parent.addChild(overlay);

    // 2. 将弹窗内容面板挂载到遮罩层中央
    const content = this.createPanel(name, options);
    overlay.addChild(content);

    // 返回弹窗控制器句柄，包含关闭销毁函数
    return { overlay, content, close: () => overlay.isValid && overlay.destroy() };
  }

  // 创建单张图片展示节点
  createImage(name: string, resourcePath: string, width: number, height: number) {
    return UIHelper.createImage(name, resourcePath, width, height);
  }

  // 根据按钮变体类型匹配对应的填充色、描边色与文本色
  private buttonColors(variant: UIButtonVariant) {
    switch (variant) {
      // 青蓝色次要操作按钮
      case 'secondary': return { fill: new Color(45, 137, 151, 255), line: new Color(25, 82, 91, 255), text: this.palette.white };
      // 浅羊皮纸静音/弱化按钮
      case 'quiet': return { fill: new Color(255, 244, 215, 255), line: new Color(142, 83, 39, 255), text: this.palette.ink };
      // 默认橙黄色主题主按钮
      default: return { fill: new Color(236, 151, 55, 255), line: new Color(116, 64, 30, 255), text: new Color(255, 252, 235, 255) };
    }
  }

  // 给面板四角绘制手绘风金属铆钉花纹（外圈描边 + 内圈亮金圆点）
  private decoratePanel(node: Node, width: number, height: number, accent: Color) {
    const decor = new Node('PanelDecor');
    decor.addComponent(UITransform).setContentSize(width, height);
    const graphics = decor.addComponent(Graphics);
    graphics.strokeColor = new Color(accent.r, accent.g, accent.b, 180);
    graphics.lineWidth = 2;
    const x = width / 2 - 20;
    const y = height / 2 - 20;
    // 四个角定位并逐个绘制
    [[-x, y], [x, y], [-x, -y], [x, -y]].forEach(([cx, cy]) => {
      // 外圈深色圆环
      graphics.circle(cx, cy, 5);
      graphics.stroke();
      // 内圈金黄色小圆点
      graphics.fillColor = new Color(255, 225, 150, 255);
      graphics.circle(cx, cy, 2);
      graphics.fill();
    });
    node.addChild(decor);
    decor.setSiblingIndex(0); // 放在底层，不遮挡内容
  }

  // 绘制按钮装饰（上半部半透明高光层 + 两侧螺栓铆钉）
  private decorateButton(node: Node, width: number, height: number, line: Color) {
    const decor = new Node('ButtonDecor');
    decor.addComponent(UITransform).setContentSize(width, height);
    const graphics = decor.addComponent(Graphics);

    // 1. 上半部画一层白色半透明高光，做出凸起立体质感
    graphics.fillColor = new Color(255, 255, 255, 38);
    graphics.roundRect(-width / 2 + 5, 0, width - 10, height / 2 - 5, Math.max(5, height * 0.2));
    graphics.fill();

    // 2. 按钮宽度高度足够时，在左右两侧各画一颗小铆钉
    if (width >= 120 && height >= 50) {
      graphics.fillColor = new Color(255, 226, 137, 235);
      graphics.strokeColor = line;
      graphics.lineWidth = 1.5;
      [-width / 2 + 13, width / 2 - 13].forEach((x) => {
        graphics.circle(x, 0, 3.5);
        graphics.fill();
        graphics.stroke();
      });
    }

    node.addChild(decor);
    decor.setSiblingIndex(0); // 放在文字下层
  }
}
