import { Node, Size, UITransform, view } from 'cc';
import { IUISkin } from '../framework/ui/IUISkin';
import { BaseGameController, BaseGameState } from './BaseGameController';
import { CoverRenderer } from './pageRender/CoverRenderer';

/**
 * 通用单页 UI 控制器。
 * 管理页面根节点；各页面自身的清理由对应页面组件处理。
 */
export abstract class BasePageGameController extends BaseGameController {
  protected abstract readonly skin: IUISkin;
  protected abstract readonly uiSkins: readonly IUISkin[];

  private pageRoot: Node | null = null;

  onDestroy() {
    this.pageRoot?.destroy();
  }

  /** 框架默认直接打开封面页，玩家点击开始即可进入游戏玩法 */
  protected bootstrap() {
    this.showCover();
  }

  // 展示封面界面
  protected showCover() {
    this.setState(BaseGameState.Cover);
    const size = view.getVisibleSize();
    const root = this.createPage('CoverPage');
    this.renderCoverExtras(root, size);
    CoverRenderer.attach(root, this.skin).render(size, () => this.onCoverStart());
  }

  // 允许子类在封面上增加额外功能（比如顶部设置栏、免广告券等）
  protected renderCoverExtras(_root: Node, _size: Size): void {}

  // 封面点击“开始游戏”后的回调，默认直接进入玩法界面
  protected onCoverStart(): void { 
    this.showPlay(); 
  }

  // 子类实现具体的玩法页面加载与启动
  protected abstract showPlay(): void;

  /** 创建并切换全屏页面；玩法页、结算页等均可复用。 */
  protected createPage(name: string) {
    this.pageRoot?.destroy();

    const size = view.getVisibleSize();
    const root = new Node(name);
    root.addComponent(UITransform).setContentSize(size.width, size.height);
    this.node.addChild(root);

    this.pageRoot = root;
    return root;
  }
}
