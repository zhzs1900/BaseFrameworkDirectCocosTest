import { _decorator, Graphics, Node, Size, UITransform, view } from 'cc';
import { IUISkin } from './framework/ui/IUISkin';
import { PuzzleStorySkin } from './framework/ui/impl/PuzzleStorySkin';
import { BaseGameState } from './gameCommon/BaseGameController';
import { BasePageGameController } from './gameCommon/BasePageGameController';
import { TopBar } from './gameCommon/pageRender/TopBar';
import { rewardedAdGameService } from './gameCommon/services/RewardedAdGameService';

const { ccclass } = _decorator;

// 游戏主入口，精简后仅负责封面流转与进入核心玩法页
@ccclass('StarterGame')
export class StarterGame extends BasePageGameController {
  // 当前使用的皮肤合集，默认手绘风
  protected readonly uiSkins: readonly IUISkin[] = [new PuzzleStorySkin()];
  // 主界面皮肤
  protected readonly skin: IUISkin = this.uiSkins[0];

  // 封面上挂载公共顶栏（设置、免广告券和侧边栏入口）
  protected renderCoverExtras(root: Node, size: Size) {
    TopBar.attach(root, this.skin).render(size);
  }

  // 封面点击“开始游戏”后，直接进入玩法页面
  protected onCoverStart() {
    this.showPlay(1);
  }

  // 进入游戏核心玩法页面
  protected showPlay(level = 1) {
    this.setState(BaseGameState.Playing);
    const size = view.getVisibleSize();
    // 创建纯净玩法根节点
    const root = this.createPage('PlayPage');

    // 简单放个返回封面按钮，方便测试
    const backBtn = this.skin.createButton('BackBtn', '‹ 返回', {
      width: 104,
      height: 48,
      fontSize: 18,
      variant: 'quiet',
      onClick: () => this.showCover(),
    });
    backBtn.setPosition(-size.width / 2 + 66, size.height / 2 - 76);
    root.addChild(backBtn);

    const adBtn = this.skin.createButton('RewardedAdBtn', '观看广告', {
      width: 220,
      height: 60,
      fontSize: 22,
      variant: 'primary',
      onClick: () => { void rewardedAdGameService.show('play-button'); },
    });
    adBtn.setPosition(0, -size.height / 2 + 100);
    root.addChild(adBtn);

    // 按钮右上角的激励广告标识。
    const adIcon = new Node('AdIcon');
    adIcon.addComponent(UITransform).setContentSize(48, 28);
    const graphics = adIcon.addComponent(Graphics);
    graphics.fillColor = this.skin.palette.cream;
    graphics.strokeColor = this.skin.palette.line;
    graphics.lineWidth = 2;
    graphics.roundRect(-24, -14, 48, 28, 7);
    graphics.fill();
    graphics.stroke();
    graphics.fillColor = this.skin.palette.ink;
    graphics.moveTo(-17, -6);
    graphics.lineTo(-17, 6);
    graphics.lineTo(-8, 0);
    graphics.close();
    graphics.fill();
    const adLabel = this.skin.createText('AdLabel', 'AD', { fontSize: 13, bold: true });
    adLabel.setPosition(8, 0);
    adIcon.addChild(adLabel);
    adIcon.setPosition(88, 28);
    adBtn.addChild(adIcon);
  }
}
