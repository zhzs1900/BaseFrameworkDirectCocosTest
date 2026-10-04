import { _decorator, Component, Rect, Size, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 序列帧动画组件
 * 用于处理基于大图（Texture2D）的网格化精灵动画播放
 */
@ccclass('SpriteAnimation')
export class SpriteAnimation extends Component {
  // 动画用的大图纹理（通常是整张包含多个动作帧的合图）
  @property({ type: Texture2D })
  texture: Texture2D | null = null;

  // 大图切分总行数
  @property
  totalRows = 1;

  // 大图切分总列数
  @property
  totalCols = 1;

  // 单行动画播放的总帧数（-1 表示播放整行全部列）
  @property
  frameCount = -1;

  // 动画渲染的尺寸缩放比例
  @property
  animationScale = 1;

  // 可选的预览尺寸上限；大尺寸精灵图会等比缩小，避免超出展示容器。
  @property
  maxDisplayWidth = 0;

  @property
  maxDisplayHeight = 0;

  // 帧与帧之间的播放间隔时间（单位：秒）
  @property
  interval = 0.1;

  // 是否在组件加载完毕后自动播放第一行动画
  @property
  playOnLoad = false;

  // 负责渲染画面的 Sprite 组件
  private sprite: Sprite | null = null;
  // 缓存当前动画切分出的所有序列帧实例
  private frames: SpriteFrame[] = [];
  // 帧时间累加器
  private timer = 0;
  // 当前播放到的帧索引
  private currentFrameIndex = 0;
  // 当前是否处于播放中
  private isPlaying = false;
  // 是否循环播放
  private loop = true;
  // 缓存当前动画的唯一特征标识，防止重复调用同一动画被打断重播
  private currentAnimKey = '';
  // 当前生效的缩放倍率
  private currentScale = 1;

  onLoad() {
    // 确保节点上有 Sprite 组件，没有的话动态补一个
    this.sprite = this.node.getComponent(Sprite) || this.node.addComponent(Sprite);
    // UITransform 组件也是必须的，用于设置帧尺寸
    if (!this.node.getComponent(UITransform)) {
      this.node.addComponent(UITransform);
    }

    // 动态创建节点时，资源加载回调可能早于组件生命周期完成。
    // 此时播放逻辑已经缓存了帧，但当时还没有 Sprite 可供绘制；在这里补绘首帧。
    if (this.frames.length > 0) {
      this.renderFrame(this.currentFrameIndex);
    }

    // 勾选了加载自动播放且有纹理时，默认播第0行
    if (this.playOnLoad && this.texture) {
      this.playAnimation(0);
    }
  }

  /**
   * 播放指定某一行的序列帧动画
   * @param rowIndex 目标行索引（从0开始）
   * @param loop 是否循环播放，默认 true
   * @param frameCount 播放帧数，不传就取组件属性默认值
   * @param scale 缩放倍率，不传就取组件属性默认值
   */
  playAnimation(rowIndex: number, loop: boolean = true, frameCount?: number, scale?: number) {
    if (!this.texture) {
      console.warn('[SpriteAnimation] 缺少纹理图片，无法播放');
      return;
    }

    const finalFrameCount = frameCount ?? this.frameCount;
    const finalScale = scale ?? this.animationScale;
    // 拼一个唯一标识用来做重复播放的拦截
    const animKey = `row:${rowIndex}:count:${finalFrameCount}:loop:${loop}:scale:${finalScale}`;

    // 如果已经在播完全相同的动画，就直接忽略，避免动画被打断重新开始
    if (this.isPlaying && this.currentAnimKey === animKey) {
      return;
    }

    this.currentAnimKey = animKey;
    this.currentScale = finalScale;
    this.loop = loop;
    // 切割当前行的帧并重置播放状态
    this.frames = this.generateFrames(rowIndex, finalFrameCount);
    this.currentFrameIndex = 0;
    this.timer = 0;
    this.isPlaying = this.frames.length > 0;
    this.renderFrame(0);
  }

  /**
   * 跨行列播放指定范围的序列帧动画
   * @param startRow 起始行
   * @param startCol 起始列
   * @param endRow 结束行
   * @param endCol 结束列
   * @param loop 是否循环播放，默认 true
   * @param scale 缩放倍率
   */
  playAnimationRange(startRow: number, startCol: number, endRow: number, endCol: number, loop: boolean = true, scale?: number) {
    if (!this.texture) {
      console.warn('[SpriteAnimation] 缺少纹理图片，无法播放');
      return;
    }

    const finalScale = scale ?? this.animationScale;
    const animKey = `range:${startRow}:${startCol}:${endRow}:${endCol}:loop:${loop}:scale:${finalScale}`;

    // 已经在播同样的范围动画则不重复处理
    if (this.isPlaying && this.currentAnimKey === animKey) {
      return;
    }

    this.currentAnimKey = animKey;
    this.currentScale = finalScale;
    this.loop = loop;
    // 按照指定行列区间切帧
    this.frames = this.generateFramesRange(startRow, startCol, endRow, endCol);
    this.currentFrameIndex = 0;
    this.timer = 0;
    this.isPlaying = this.frames.length > 0;
    this.renderFrame(0);
  }

  /**
   * 静态展示指定位置的单帧画面并停止播放
   * @param rowIndex 行索引
   * @param colIndex 列索引
   * @param scale 缩放倍率
   */
  showStaticFrame(rowIndex: number, colIndex: number, scale?: number) {
    if (!this.texture) {
      console.warn('[SpriteAnimation] 缺少纹理图片，无法展示');
      return;
    }

    const finalScale = scale ?? this.animationScale;
    const animKey = `static:${rowIndex}:${colIndex}:scale:${finalScale}`;

    // 已经是静止展示同一帧就不重复切图渲染了
    if (!this.isPlaying && this.currentAnimKey === animKey) {
      return;
    }

    this.currentAnimKey = animKey;
    this.currentScale = finalScale;
    this.stop();
    // 仅切出指定行列的单张图片帧
    this.frames = this.generateFramesRange(rowIndex, colIndex, rowIndex, colIndex);
    this.currentFrameIndex = 0;
    this.timer = 0;
    this.renderFrame(0);
  }

  /**
   * 停止当前动画播放
   */
  stop() {
    this.isPlaying = false;
  }

  /**
   * 每帧更新驱动动画切换
   */
  update(deltaTime: number) {
    // 没处于播放中或者总帧数小于等于1都不需要切帧
    if (!this.isPlaying || this.frames.length <= 1) {
      return;
    }

    // 累加时间，未达到间隔时间先不切帧
    this.timer += deltaTime;
    if (this.timer < this.interval) {
      return;
    }

    // 重置计时器并跳到下一帧
    this.timer = 0;
    this.currentFrameIndex += 1;

    // 到达最后一帧时的边界与循环处理
    if (this.currentFrameIndex >= this.frames.length) {
      if (!this.loop) {
        // 不循环就定格在最后一帧并停止播放
        this.currentFrameIndex = this.frames.length - 1;
        this.isPlaying = false;
      } else {
        // 循环播放则回到第一帧
        this.currentFrameIndex = 0;
      }
    }

    this.renderFrame(this.currentFrameIndex);
  }

  /**
   * 生成指定行上的序列帧数组
   * @param rowIndex 目标行
   * @param frameCount 切出的帧数（默认-1取整行）
   */
  private generateFrames(rowIndex: number, frameCount: number = -1) {
    const frames: SpriteFrame[] = [];
    if (!this.texture) {
      return frames;
    }

    // 计算单帧的宽高尺寸
    const frameWidth = this.texture.width / this.totalCols;
    const frameHeight = this.texture.height / this.totalRows;
    // 确认切多少列
    const count = frameCount > 0 ? Math.min(frameCount, this.totalCols) : this.totalCols;

    for (let col = 0; col < count; col += 1) {
      frames.push(this.createFrame(col * frameWidth, rowIndex * frameHeight, frameWidth, frameHeight));
    }

    return frames;
  }

  /**
   * 根据起止行列范围生成对应的序列帧数组
   * @param startRow 起始行
   * @param startCol 起始列
   * @param endRow 结束行
   * @param endCol 结束列
   */
  private generateFramesRange(startRow: number, startCol: number, endRow: number, endCol: number) {
    const frames: SpriteFrame[] = [];
    if (!this.texture) {
      return frames;
    }

    const frameWidth = this.texture.width / this.totalCols;
    const frameHeight = this.texture.height / this.totalRows;

    // 遍历所有目标行
    for (let row = startRow; row <= endRow; row += 1) {
      // 只有起始行从 startCol 开始，后续行都从第0列开始
      const minCol = row === startRow ? startCol : 0;
      // 只有结束行切到 endCol，前面的行都切到最后一列
      const maxCol = row === endRow ? endCol : this.totalCols - 1;

      for (let col = minCol; col <= maxCol; col += 1) {
        frames.push(this.createFrame(col * frameWidth, row * frameHeight, frameWidth, frameHeight));
      }
    }

    return frames;
  }

  /**
   * 根据矩形裁剪范围创建单个 SpriteFrame 实例
   */
  private createFrame(x: number, y: number, width: number, height: number) {
    const frame = new SpriteFrame();
    frame.texture = this.texture;
    frame.rect = new Rect(x, y, width, height);
    return frame;
  }

  /**
   * 将指定下标的序列帧更新到 Sprite 组件并同步节点尺寸
   * @param index 帧索引
   */
  private renderFrame(index: number) {
    if (!this.sprite || index >= this.frames.length) {
      return;
    }

    const frame = this.frames[index];
    this.sprite.spriteFrame = frame;
    this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;

    // 按照切帧尺寸和缩放倍率更新节点的 UI 宽高；预览场景可设置最大尺寸以防大图溢出。
    const transform = this.node.getComponent(UITransform);
    if (transform) {
      const rawWidth = frame.rect.width * this.currentScale;
      const rawHeight = frame.rect.height * this.currentScale;
      const widthScale = this.maxDisplayWidth > 0 ? this.maxDisplayWidth / rawWidth : 1;
      const heightScale = this.maxDisplayHeight > 0 ? this.maxDisplayHeight / rawHeight : 1;
      const fitScale = Math.min(1, widthScale, heightScale);
      transform.setContentSize(new Size(rawWidth * fitScale, rawHeight * fitScale));
    }
  }
}
