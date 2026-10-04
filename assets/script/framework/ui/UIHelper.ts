import { Color, Graphics, Label, LabelOutline, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';

// Cocos UI 底层构建工具类
// 只提供与具体皮肤无关的基础节点装配能力，专门供各类 UI 皮肤实现（如 PuzzleStorySkin）调用
export class UIHelper {
  // 快捷创建一个居中对齐的文本节点
  static createText(
    name: string,
    text: string,
    fontSize: number,
    color: Color,
    bold = false,
    outline?: { color: Color; width: number },
  ) {
    const node = new Node(name);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    // 按 1.28 倍字号计算行高，保证多行文本排版不局促
    label.lineHeight = Math.round(fontSize * 1.28);
    label.color = color;
    label.isBold = bold;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;

    // 如果传入了描边配置，挂载 LabelOutline 组件
    if (outline) {
      const edge = node.addComponent(LabelOutline);
      edge.color = outline.color;
      edge.width = outline.width;
    }
    return node;
  }

  // 使用 Graphics 绘制带立体层次感的圆角底板（支持投影、暗部、描边与顶部微高光）
  static drawRoundedSurface(
    node: Node,
    width: number,
    height: number,
    fill: Color,
    radius: number,
    line: Color,
  ) {
    node.addComponent(UITransform).setContentSize(width, height);
    const graphics = node.addComponent(Graphics);

    // 1. 绘制底层半透明深褐色投影（向右下偏移），营造悬浮立体感
    graphics.fillColor = new Color(74, 48, 30, 70);
    graphics.roundRect(-width / 2 + 3, -height / 2 - 5, width, height, radius);
    graphics.fill();

    // 2. 绘制主体圆角矩形底色
    graphics.fillColor = fill;
    graphics.roundRect(-width / 2, -height / 2, width, height, radius);
    graphics.fill();

    // 3. 在下半部分叠一层偏暗的半透明阴影，做出按钮/面板的厚重质感
    graphics.fillColor = new Color(
      Math.max(0, fill.r - 22),
      Math.max(0, fill.g - 22),
      Math.max(0, fill.b - 22),
      Math.min(fill.a, 72),
    );
    graphics.roundRect(-width / 2 + 2, -height / 2 + 2, width - 4, height * 0.46, Math.max(4, radius - 2));
    graphics.fill();

    // 4. 绘制外轮廓边框
    graphics.strokeColor = line;
    graphics.lineWidth = 2;
    graphics.roundRect(-width / 2, -height / 2, width, height, radius);
    graphics.stroke();

    // 5. 在顶部边缘画一条细细的半透明白色高光横线，突出边缘反光效果
    graphics.strokeColor = new Color(255, 255, 255, 105);
    graphics.lineWidth = 1;
    graphics.moveTo(-width / 2 + radius, height / 2 - 3);
    graphics.lineTo(width / 2 - radius, height / 2 - 3);
    graphics.stroke();

    return graphics;
  }

  // 异步加载 resources 目录下的 SpriteFrame 并创建图片节点
  static createImage(name: string, path: string, width: number, height: number) {
    const node = new Node(name);
    node.addComponent(UITransform).setContentSize(width, height);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;

    // 异步加载图片资源，加载完成后检测节点是否仍然有效再赋值
    resources.load(`${path}/spriteFrame`, SpriteFrame, (error, frame) => {
      if (!error && frame && node.isValid) {
        sprite.spriteFrame = frame;
      } else if (error) {
        console.warn(`[UIHelper] Failed to load image: ${path}`, error);
      }
    });
    return node;
  }


}

