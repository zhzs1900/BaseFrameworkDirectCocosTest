import { Color, Node } from 'cc';

// 按钮风格：主按钮、次要按钮、安静/无高亮按钮
export type UIButtonVariant = 'primary' | 'secondary' | 'quiet';

// 文本通用配置项
export interface UITextOptions {
  // 字号大小，不传就走皮肤默认值
  fontSize?: number;
  // 字体颜色
  color?: Color;
  // 是否加粗
  bold?: boolean;
  // 是否带描边
  outline?: boolean;
}

// 按钮配置项（继承了文本样式）
export interface UIButtonOptions extends UITextOptions {
  // 按钮宽度，不传默认 220
  width?: number;
  // 按钮高度，不传默认 60
  height?: number;
  // 按钮风格变体
  variant?: UIButtonVariant;
  // 点击回调函数
  onClick?: () => void;
}

// 面板与底框配置项
export interface UIPanelOptions {
  // 面板宽度
  width: number;
  // 面板高度
  height: number;
  // 圆角大小
  radius?: number;
}

// 弹窗创建后返回的控制器句柄，方便外部拿节点和直接调 close 关闭
export interface UIWindowHandle {
  // 全屏半透明黑色遮罩层
  overlay: Node;
  // 中间的内容面板节点
  content: Node;
  // 关闭并销毁弹窗的方法
  close: () => void;
}

// 皮肤基础调色板（统一管理常用色彩）
export interface UISkinPalette {
  white: Color;      // 纯白
  ink: Color;        // 墨水深褐色（主文字）
  cream: Color;      // 奶油米白
  paper: Color;      // 暖色羊皮纸底色
  line: Color;       // 边框描边棕色
  mutedText: Color;  // 次要辅助文字颜色
}

// UI 皮肤通用接口规范，后续如果要换像素风、木质风直接实现这套接口即可
export interface IUISkin {
  // 当前皮肤的主题色板
  readonly palette: UISkinPalette;

  // 创建基础文本
  createText(name: string, text: string, options?: UITextOptions): Node;

  // 创建带手感动效与装饰的按钮
  createButton(name: string, text: string, options?: UIButtonOptions): Node;

  // 创建带装饰边框的面板底板
  createPanel(name: string, options: UIPanelOptions): Node;

  // 创建全屏遮罩弹窗，挂载到指定父节点下
  createWindow(parent: Node, name: string, options: UIPanelOptions): UIWindowHandle;

  // 创建普通图片展示节点
  createImage(name: string, resourcePath: string, width: number, height: number): Node;
}
