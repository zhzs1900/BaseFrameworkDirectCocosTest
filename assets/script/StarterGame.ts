import { _decorator, Color, Mask, Node, resources, ScrollView, SpriteFrame, UITransform, view } from 'cc';
import { baseGameConfig } from './config/baseGameConfig';
import { BaseGameState } from './gameCommon/BaseGameController';
import { BasePageGameController } from './gameCommon/BasePageGameController';
import { rewardedAdGameService } from './gameCommon/services/RewardedAdGameService';
import { GameAudio } from './framework/common/GameAudio';
import { GameProgress } from './gameCommon/services/GameProgress';
import { GameUI } from './framework/ui/GameUI';

const { ccclass } = _decorator;
export type GameResult = 'victory' | 'failure';

@ccclass('StarterGame')
export class StarterGame extends BasePageGameController {
  private progress!: GameProgress;
  private audio!: GameAudio;
  private ui!: GameUI;
  private stage!: Node;
  private inGame = false;
  private modal: { overlay: Node; body: Node; close: () => void } | null = null;
  private resumeState: BaseGameState | null = null;

  get currentLevel() { return this.progress.level; }

  protected bootstrap() {
    this.progress = new GameProgress(this.storage);
    this.audio = new GameAudio(this.node, this.storage);
    this.ui = new GameUI(() => this.audio.click());
    view.on('canvas-resize', this.onResize, this);
    this.showCover();
  }

  onDestroy() {
    view.off('canvas-resize', this.onResize, this);
    super.onDestroy();
  }

  private onResize() {
    if (!this.stage?.isValid) { return; }
    const size = view.getVisibleSize();
    const scale = Math.min(size.width / 720, size.height / 1280);
    this.stage.setScale(scale, scale, 1);
  }

  private createStage(name: string, background: string) {
    this.closeModal();
    const root = this.createPage(name);
    this.stage = this.ui.stage(root, view.getVisibleSize());
    this.ui.image(this.stage, background, 720, 1280);
    return this.stage;
  }

  protected showCover() {
    this.inGame = false;
    this.progress.returnToCover();
    const stage = this.createStage('CoverPage', 'coverpage');
    this.setState(BaseGameState.Cover);
    this.ui.text(stage, baseGameConfig.gameTitle, 0, 510, 60, 660, new Color(253, 230, 138));
    this.ui.button(stage, '', -265, -365, 80, 80, () => this.changeLevel(-1), 'icons/icon-12', undefined, this.progress.level > 1);
    this.ui.button(stage, `第${this.progress.level}关`, 0, -365, 400, 100, () => this.showPlay(this.progress.level), 'buttons/btn_gold', 'icons/icon-4');
    this.ui.button(stage, '', 265, -365, 80, 80, () => this.changeLevel(1), 'icons/icon-13', undefined, this.progress.level < this.progress.unlockedLevel);
    if (baseGameConfig.showAdvice) {
      this.ui.text(stage, '游戏健康忠告', 0, -470, 24);
      this.ui.text(stage, '抵制不良游戏，拒绝盗版游戏。\n注意自我保护，谨防上当受骗。\n适度游戏益脑，沉迷游戏伤身。\n合理安排时间，享受健康生活。', 0, -558, 21);
    }
    this.renderControls();
  }

  private changeLevel(delta: number) {
    if (this.progress.select(this.progress.level + delta)) { this.showCover(); }
  }

  protected showPlay(level = this.progress.level) {
    if (!this.progress.select(level, true)) { return; }
    this.inGame = true;
    const stage = this.createStage('PlayPage', 'background');
    this.setState(BaseGameState.Playing);
    const gameplay = this.ui.node(stage, 'GameplayRoot', 720, 1280);
    this.renderGameplay(gameplay, level);
    this.renderControls();
    this.ui.button(stage, '观看广告', 0, -500, 260, 70,
      () => { void rewardedAdGameService.show('play-button'); }, 'buttons/btn_gold', 'icons/icon-4');
  }

  /** 新游戏在这里挂载玩法；每次选关、重试、下一关都会重新创建根节点。 */
  protected renderGameplay(_root: Node, _level: number) {}

  private renderControls() {
    this.ui.button(this.stage, '', 300, 580, 64, 64, () => this.showSettings(), this.inGame ? 'icons/icon-1' : 'icons/icon-2');
    if (baseGameConfig.debug) {
      this.ui.button(this.stage, 'DEBUG', 260, -605, 180, 44, () => this.showDebug(), 'buttons/btn_debug', 'icons/icon-14');
    }
    if (!this.inGame && this.sidebar.isSupported()) {
      this.ui.button(this.stage, '侧边栏', -270, -420, 140, 52, () => this.showSidebar(), 'buttons/btn_dark');
    }
  }

  private openModal(title: string, height = 760) {
    this.closeModal();
    this.resumeState = this.getState();
    if (this.resumeState === BaseGameState.Playing) { this.setState(BaseGameState.Paused); }
    this.modal = this.ui.modal(this.stage, title, height);
    this.ui.button(this.modal.body, '', 280, height / 2 - 15, 56, 56, () => this.closeModal(), 'icons/icon-3');
    return this.modal.body;
  }

  private closeModal() {
    this.modal?.close();
    this.modal = null;
    if (this.resumeState !== null && this.getState() === BaseGameState.Paused) { this.setState(this.resumeState); }
    this.resumeState = null;
  }

  private showSettings() {
    const body = this.openModal(this.inGame ? '游戏菜单' : '游戏设置', 860);
    this.modal!.overlay.on(Node.EventType.TOUCH_END, () => this.closeModal());
    this.ui.button(body, `音乐：${this.audio.musicEnabled ? '已开启' : '已关闭'}`, -140, 160, 250, 200, () => {
      this.audio.setMusic(!this.audio.musicEnabled);
      this.showSettings();
    }, 'panels/card_common', undefined, true, -45);
    this.ui.image(body, this.audio.musicEnabled ? 'icons/icon-7' : 'icons/icon-8', 80, 80, -140, 210);
    this.ui.button(body, `音效：${this.audio.effectsEnabled ? '已开启' : '已关闭'}`, 140, 160, 250, 200, () => {
      this.audio.setEffects(!this.audio.effectsEnabled);
      this.showSettings();
    }, 'panels/card_common', undefined, true, -45);
    this.ui.image(body, this.audio.effectsEnabled ? 'icons/icon-9' : 'icons/icon-10', 80, 80, 140, 210);
    if (this.inGame) {
      this.ui.button(body, '继续游戏', 0, -50, 500, 90, () => this.closeModal(), 'buttons/btn_gold', 'icons/icon-4');
      this.ui.button(body, '返回封面', 0, -170, 500, 90, () => this.showCover(), 'buttons/btn_dark', 'icons/icon-5');
    } else {
      this.ui.button(body, '添加桌面', 0, -40, 500, 80, () => {
        void this.openAbilities.addShortcut().then(result => this.showNotice(body, result.message));
      });
      this.ui.button(body, '添加侧边栏', 0, -150, 500, 80, () => this.showSidebar());
      if (baseGameConfig.adConfig.subscribeMessageEnabled) {
        this.ui.button(body, '订阅消息', 0, -260, 500, 80, () => {
          void this.openAbilities.requestSubscribeMessage().then(result => this.showNotice(body, result.message));
        });
      }
    }
  }

  private showNotice(source: Node, message: string) {
    if (!source.isValid || !source.activeInHierarchy) { return; }
    const body = this.openModal('温馨提示', 420);
    this.ui.text(body, message, 0, 20, 22, 530);
    this.ui.button(body, '知道了', 0, -110, 240, 70, () => this.closeModal());
  }

  private showSidebar() {
    const added = this.sidebar.isLaunchedFromSidebar();
    const body = this.openModal(added ? '已在侧边栏' : '添加到侧边栏', 600);
    this.ui.image(body, 'icon', 120, 120, 0, 110);
    this.ui.text(body, added ? '可以从抖音首页侧边栏随时启动游戏' : '前往抖音首页侧边栏，点击本游戏卡片加入', 0, 0, 20, 550);
    this.ui.button(body, added ? '已添加成功' : '前往首页侧边栏', 0, -120, 440, 80, () => {
      if (added) { this.closeModal(); return; }
      void this.sidebar.navigate().then(ok => {
        if (ok) { if (body.isValid && body.activeInHierarchy) { this.closeModal(); } }
        else { this.showNotice(body, '当前环境不支持跳转，请在抖音小游戏中使用'); }
      });
    });
  }

  /** 玩法完成时调用；调试菜单复用相同结算流程。 */
  public finishGame(result: GameResult) {
    if (!this.inGame) { this.showPlay(); }
    this.closeModal();
    const victory = result === 'victory';
    if (victory) { this.progress.win(); }
    this.setState(victory ? BaseGameState.Victory : BaseGameState.GameOver);
    const body = this.openModal(victory ? '游戏胜利' : '游戏失败', 780);
    // 结算只能通过下一关、重试或返回封面离开。
    body.children.find(child => child.name === 'icons/icon-3')!.active = false;
    this.ui.image(body, 'panels/medallion_common', 180, 180, 0, 165);
    this.ui.image(body, victory ? 'icons/icon_trophy' : 'icons/icon-3', 120, 120, 0, 165);
    const lastLevel = this.progress.level === this.progress.totalLevels;
    this.ui.text(body, victory && lastLevel ? '恭喜你，全部关卡已通关！' : `第${this.progress.level}关挑战${victory ? '成功' : '失败'}`, 0, 20, 28, 540);
    if (!victory || !lastLevel) {
      this.ui.button(body, victory ? '进入下一关' : '重新挑战', 0, -115, 500, 90,
        () => this.showPlay(this.progress.level + (victory ? 1 : 0)), 'buttons/btn_gold', victory ? 'icons/icon-13' : 'icons/icon-6');
    }
    this.ui.button(body, '返回封面', 0, -235, 500, 90, () => this.showCover(), 'buttons/btn_dark', 'icons/icon-5');
  }

  private showDebug() {
    const body = this.openModal('调试控制台 (DEBUG)', 640);
    this.ui.button(body, '1. UI 展示', 0, 130, 520, 90, () => this.showGallery(), 'buttons/btn_dark', 'icons/icon_gallery');
    this.ui.button(body, '2. 关卡选择', 0, 10, 520, 90, () => this.showLevels(), 'buttons/btn_dark', 'icons/icon_levels');
    this.ui.button(body, '3. 触发事件', 0, -110, 520, 90, () => this.showEvents(), 'buttons/btn_dark', 'icons/icon_events');
  }

  private debugBack(body: Node, y: number) {
    this.ui.button(body, '返回调试菜单', 0, y, 280, 60, () => this.showDebug(), 'buttons/btn_back');
  }

  private showEvents() {
    const body = this.openModal('触发事件', 560);
    this.ui.button(body, '触发胜利', 0, 80, 500, 90, () => this.finishGame('victory'), 'buttons/btn_gold', 'icons/icon_trophy');
    this.ui.button(body, '触发失败', 0, -40, 500, 90, () => this.finishGame('failure'), 'buttons/btn_dark', 'icons/icon-3');
    this.debugBack(body, -170);
  }

  private showLevels() {
    const body = this.openModal('选择关卡', 1120);
    for (let level = 1; level <= this.progress.totalLevels; level += 1) {
      const index = level - 1;
      this.ui.button(body, `STAGE\n${level}`, index % 2 === 0 ? -140 : 140, 350 - Math.floor(index / 2) * 165,
        250, 140, () => this.showPlay(level), level === this.progress.level ? 'buttons/card_stage_on' : 'buttons/card_stage');
    }
    this.debugBack(body, -460);
  }

  private showGallery() {
    const body = this.openModal('UI 组件展示', 1120);
    const viewport = this.ui.node(body, 'GalleryViewport', 540, 840, 0, -10);
    viewport.addComponent(Mask);
    const scroll = viewport.addComponent(ScrollView);
    scroll.horizontal = false;
    const paths = resources.getDirWithPath('ui', SpriteFrame)
      .map(info => info.path.replace(/^ui\//, '').replace(/\/spriteFrame$/, '')).sort();
    const height = Math.ceil(paths.length / 2) * 220;
    const content = this.ui.node(viewport, 'GalleryContent', 540, height);
    content.getComponent(UITransform)!.setAnchorPoint(0.5, 1);
    content.setPosition(0, 420);
    scroll.content = content;
    paths.forEach((path, index) => {
      const x = index % 2 === 0 ? -135 : 135;
      const y = -110 - Math.floor(index / 2) * 220;
      const card = this.ui.image(content, 'panels/card_common', 250, 200, x, y);
      this.ui.text(card, path.split('/').pop()!, 0, 72, 18, 230);
      this.ui.image(card, path, 220, 130, 0, -20, true);
    });
    this.debugBack(body, -490);
  }
}
