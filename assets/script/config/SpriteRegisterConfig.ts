/**
 * 精灵图注册配置
 * 用于定义序列帧动画的相关参数，便于 SpriteAnimation 组件或相关逻辑加载
 * index索引从0开始，包含开始和结束帧索引
 * 字段详细解释:
 * - path: 资源路径
 * - totalRows: 总行数
 * - totalCols: 总列数
 * - displays: 播放配置
 *   - type: 播放类型(必传)：playAnimation (播放整行动画) , playAnimationRange (播放指定范围动画), showStaticFrame (展示静态帧)
 * 
 *   - rowIndex: 行索引 
 *   - startRow: 开始行 
 *   - startCol: 开始列 
 *   - endRow: 结束行 
 *   - endCol: 结束列 
 *   
 *   - loop: 是否循环播放（非必传，默认值为true）
 *   - frameCount: 播放帧数 (非必传，默认整行全部帧)：例如frameCount: 6 表示播放这一行的前6个精灵帧
 *   - scale: 缩放倍率 (非必传，默认值为1)
 *   
 *   调用例子：调用工具类播放动画（格式为 "资源Key.展示Key"）
 *      播放整行动画: SpriteRegisterPlay.play(animComp, 'animation1.fullPlay');
 *      播放局部范围动画: SpriteRegisterPlay.play(animComp, 'animation1.partialPlay');
 *      仅展示某一帧静态图: SpriteRegisterPlay.play(animComp, 'animation1.staticFrame');
 */
export const SpriteRegisterConfig = {
  /** 
   * 示例动画 1
   * 规格: 1行6列
   */
  animation1: {
    path: 'spriteAnimation/animation-1',
    totalRows: 1,
    totalCols: 6,
    displays: {
      // 播放整行动画的配置示例 (playAnimation)
      fullPlay: { type: 'playAnimation', rowIndex: 0, loop: true, frameCount: 6, scale: 1 },
      // 播放指定范围动画的配置示例 (playAnimationRange)
      partialPlay: { type: 'playAnimationRange', startRow: 0, startCol: 0, endRow: 0, endCol: 3, loop: true, scale: 1.2 },
      // 展示静态帧的配置示例 (showStaticFrame)
      staticFrame: { type: 'showStaticFrame', rowIndex: 0, colIndex: 2, scale: 1.5 },
    }
  },

  /** 
   * 示例动画 2
   * 规格: 1行6列
   */
  animation2: {
    path: 'spriteAnimation/animation-2',
    totalRows: 1,
    totalCols: 6,
    displays: {
      fullPlay: { type: 'playAnimation', rowIndex: 0, loop: true },
      partialPlay: { type: 'playAnimationRange', startRow: 0, startCol: 2, endRow: 0, endCol: 5, loop: false },
      staticFrame: { type: 'showStaticFrame', rowIndex: 0, colIndex: 0 },
    }
  },

  /**
   * 拼接精灵图
   * 规格: 2行4列，每一行对应一个独立动画
   */
  animation3: {
    path: 'spriteAnimation/animation-3',
    totalRows: 2,
    totalCols: 4,
    displays: {
      row0Loop: { type: 'playAnimation', rowIndex: 0, loop: true, frameCount: 4 },
      row1Loop: { type: 'playAnimation', rowIndex: 1, loop: true, frameCount: 4 },
    }
  },

} as const;



/** 
 * 精灵图类型定义，方便在其他地方进行类型约束 
 */
export type SpriteRegisterKey = keyof typeof SpriteRegisterConfig;
