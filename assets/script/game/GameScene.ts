import { _decorator, Component, Node } from 'cc';
import { GameUI } from '../framework/ui/GameUI';
import { rewardedAdGameService } from '../common/services/RewardedAdGameService';
import type { GameResult } from '../common/services/GameProgress';

const { ccclass } = _decorator;

/** 游戏业务入口；每次选关、重试或下一关都会创建新的组件。 */
@ccclass('GameScene')
export class GameScene extends Component {
  level = 1;
  private onFinish!: (result: GameResult) => void;

  initialize(ui: GameUI, level: number, onFinish: (result: GameResult) => void, onMenu: () => void) {
    this.level = level;
    this.onFinish = onFinish;
    ui.image(this.node, 'background', 720, 1280);
    const gameplay = ui.node(this.node, 'GameplayRoot', 720, 1280);
    this.renderGameplay(gameplay, level);
    ui.button(this.node, '', 300, 580, 64, 64, onMenu, 'icons/icon-1');
    ui.button(this.node, '观看广告', 0, -500, 260, 70,
      () => { void rewardedAdGameService.show('play-button'); }, 'buttons/btn_gold', 'icons/icon-4');
  }

  /** 在这里创建关卡节点或挂载玩法组件。 */
  protected renderGameplay(_root: Node, _level: number) {}

  /** 玩法结束时调用，结算和进度保存由公共流程处理。 */
  finishGame(result: GameResult) {
    this.onFinish(result);
  }
}
