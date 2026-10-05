import { Color, JsonAsset, Label, LabelOutline, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';

type ImageListItem = {
  useName: string;
  fileName: string;
};

// Cocos UI 底层构建工具类
// 提供文本和图片节点装配，供 GameUI 调用
export class UIHelper {
  private static readonly imageMapCache = new Map<string, Map<string, string>>();
  private static readonly imageMapLoading = new Map<string, Array<(mapping: Map<string, string>) => void>>();

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

  // 异步加载 resources 目录下的 SpriteFrame 并创建图片节点。
  // path 使用“使用名路径”，例如 ui/buttons/btn_gold。
  // 实际文件名由同目录下的 list.json 决定；映射不存在时自动兼容旧的直接路径。
  static createImage(name: string, path: string, width: number, height: number, contain = false) {
    const node = new Node(name);
    node.addComponent(UITransform).setContentSize(width, height);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;

    UIHelper.resolveImagePath(path, (resolvedPath) => {
      if (!node.isValid) return;

      resources.load(`${resolvedPath}/spriteFrame`, SpriteFrame, (error, frame) => {
        if (!error && frame && node.isValid) {
          sprite.spriteFrame = frame;
          if (contain) {
            const original = frame.originalSize;
            const scale = Math.min(width / original.width, height / original.height);
            node.getComponent(UITransform)!.setContentSize(original.width * scale, original.height * scale);
          }
        } else if (error) {
          console.warn(`[UIHelper] Failed to load image: ${path} -> ${resolvedPath}`, error);
        }
      });
    });

    return node;
  }

  private static resolveImagePath(path: string, done: (resolvedPath: string) => void) {
    const slashIndex = path.lastIndexOf('/');
    const directory = slashIndex >= 0 ? path.slice(0, slashIndex) : '';
    const useName = slashIndex >= 0 ? path.slice(slashIndex + 1) : path;

    UIHelper.loadImageMap(directory, (mapping) => {
      const fileName = mapping.get(useName) ?? useName;
      // Cocos resources.load 加载 SpriteFrame 时路径不带图片扩展名。
      const fileBaseName = fileName.replace(/\.(png|jpe?g|webp)$/i, '');
      done(directory ? `${directory}/${fileBaseName}` : fileBaseName);
    });
  }

  private static loadImageMap(directory: string, done: (mapping: Map<string, string>) => void) {
    const cached = UIHelper.imageMapCache.get(directory);
    if (cached) {
      done(cached);
      return;
    }

    const loadingCallbacks = UIHelper.imageMapLoading.get(directory);
    if (loadingCallbacks) {
      loadingCallbacks.push(done);
      return;
    }

    UIHelper.imageMapLoading.set(directory, [done]);
    const listPath = directory ? `${directory}/list` : 'list';

    resources.load(listPath, JsonAsset, (error, asset) => {
      const mapping = new Map<string, string>();

      if (!error && asset && Array.isArray(asset.json)) {
        for (const item of asset.json as ImageListItem[]) {
          if (!item || typeof item.useName !== 'string' || typeof item.fileName !== 'string') continue;
          mapping.set(item.useName, item.fileName);
        }
      } else if (error) {
        // list.json 是兼容增强能力：没有映射文件时仍按旧路径加载，不阻断游戏。
        console.warn(`[UIHelper] Image mapping not found: ${listPath}.json, fallback to direct path.`);
      }

      UIHelper.imageMapCache.set(directory, mapping);
      const callbacks = UIHelper.imageMapLoading.get(directory) ?? [];
      UIHelper.imageMapLoading.delete(directory);
      for (const callback of callbacks) callback(mapping);
    });
  }
}
