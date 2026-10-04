import { _decorator, Color, Component, LabelOutline, Node, Size, Tween, tween, UITransform, Vec3 } from 'cc';
import { IUISkin } from '../../framework/ui/IUISkin';
import { baseGameConfig } from '../../config/baseGameConfig';

const { ccclass } = _decorator;

/** 
 * 游戏封面页渲染器
 * 负责封面上的游戏标题、主按钮绘制、动效以及底部的健康游戏忠告提示
 */
@ccclass('CoverRenderer')
export class CoverRenderer extends Component {
  // 记录正在做呼吸动画的按钮节点，页面切走时用来停止 Tween
  private breathingButton: Node | null = null;
  // 标题节点，切界面时一并停掉动效
  private titleNode: Node | null = null;
  private skin!: IUISkin;

  /** 挂到封面根节点；封面销毁时会自动停止自身动画。 */
  static attach(root: Node, skin: IUISkin) {
    const renderer = root.addComponent(CoverRenderer);
    renderer.skin = skin;
    return renderer;
  }

  /**
   * 渲染封面页面内容
   * @param root 封面页的根节点
   * @param size 当前屏幕尺寸
   * @param onStart 点击“开始游戏”按钮后的回调
   */
  render(size: Size, onStart: () => void) {
    const root = this.node;
    // 渲染前先停掉之前的呼吸动画，防止重复
    this.stopBreathing();

    // 0. 如果配置了游戏标题，绘制金色立体艺术字，并加上平滑的上下悬浮动效。
    if (baseGameConfig.gameTitle) {
      // 参考封面构图：标题位于画面上方约三分之一处，为角色和底部按钮留出空间。
      const topY = size.height * 0.18;
      const titleArtwork = this.createTitleArtwork(size);
      titleArtwork.setPosition(0, topY);
      root.addChild(titleArtwork);
      this.titleNode = titleArtwork;

      // 标题动效：整体上下平滑浮动，保证描边和阴影同步移动。
      tween(titleArtwork)
        .to(1.2, { position: new Vec3(0, topY + 10, 0) }, { easing: 'sineInOut' })
        .to(1.2, { position: new Vec3(0, topY - 10, 0) }, { easing: 'sineInOut' })
        .union()
        .repeatForever()
        .start();
    }

    // 1. 创建“开始游戏”主按钮
    const startButton = this.skin.createButton('StartButton', '开始游戏', {
      width: 300,
      height: 80,
      fontSize: 25,
      variant: 'primary',
      onClick: onStart,
    });
    // 针对短屏手机做位置适配，避免按钮太靠下穿帮
    startButton.setPosition(0, size.height <= 700 ? -130 : -200);
    root.addChild(startButton);

    // 给开始按钮添加轻微的循环呼吸缩放动画，引导玩家点击
    this.breathingButton = startButton;
    tween(startButton)
      .to(0.85, { scale: new Vec3(1.055, 1.055, 1) }, { easing: 'sineInOut' })
      .to(0.85, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
      .union()
      .repeatForever()
      .start();

    // 2. 如果开启了健康游戏忠告，在底部渲染提示内容（默认不开启）
    if (baseGameConfig.showAdvice) {
      // 健康游戏忠告标题
      const title = this.skin.createText('HealthAdviceTitle', '健康游戏忠告', {
        fontSize: 28,
        color: this.skin.palette.white,
        bold: true,
        outline: true,
      });
      title.setPosition(0, -size.height / 2 + 180);
      root.addChild(title);

      // 健康游戏忠告正文标语
      const advice = this.skin.createText(
        'HealthAdvice',
        '抵制不良游戏，拒绝盗版游戏。\n注意自我保护，谨防受骗上当。\n适度游戏益脑，沉迷游戏伤身。\n合理安排时间，享受健康生活。',
        { fontSize: 25, color: this.skin.palette.white, outline: true },
      );
      (advice.getComponent(UITransform) || advice.addComponent(UITransform))
        .setContentSize(Math.min(size.width - 48, 760), 150);
      advice.setPosition(0, -size.height / 2 + 72);
      root.addChild(advice);
    }
  }

  /** 通过阴影层、加粗描边和暖金前景拼出封面主标题的立体艺术字效果。 */
  private createTitleArtwork(size: Size) {
    const artwork = new Node('GameTitleArtwork');
    const title = baseGameConfig.gameTitle;
    // 参考图为无装饰符号的紧凑主标题；标题较长时自动收窄字号而不压到屏幕边缘。
    const fontSize = Math.min(52, Math.max(40, (size.width - 150) / title.length));

    // 最底层的深棕字与厚描边，形成参考图中厚实的下沉投影。
    const shadow = this.skin.createText('GameTitleShadow', title, {
      fontSize, color: new Color(91, 45, 20, 255), bold: true, outline: true,
    });
    shadow.getComponent(LabelOutline)!.color = new Color(67, 32, 17, 255);
    shadow.getComponent(LabelOutline)!.width = 7;
    shadow.setPosition(3, -6);
    artwork.addChild(shadow);

    // 主字采用奶油金色，并以棕色描边增加在复杂背景上的辨识度。
    const foreground = this.skin.createText('GameTitle', title, {
      fontSize, color: new Color(255, 226, 137, 255), bold: true, outline: true,
    });
    foreground.getComponent(LabelOutline)!.color = new Color(111, 54, 22, 255);
    foreground.getComponent(LabelOutline)!.width = 4;
    artwork.addChild(foreground);

    return artwork;
  }

  /**
   * 停止封面上的动画并清理引用
   */
  stopBreathing() {
    if (this.breathingButton) {
      Tween.stopAllByTarget(this.breathingButton);
      this.breathingButton = null;
    }
    if (this.titleNode) {
      Tween.stopAllByTarget(this.titleNode);
      this.titleNode = null;
    }
  }

  onDestroy() {
    this.stopBreathing();
  }
}
