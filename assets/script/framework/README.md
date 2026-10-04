# Cocos 小游戏基础框架使用文档

本框架面向 Cocos Creator 3.8 小游戏项目，已完成全面精简：去除了冗余的大厅过渡和疲劳体力机制，去除了免广告券和内置声音播放模块，点击封面直接进入游戏玩法页。同时保留了核心的商业化与运营能力（激励视频广告、插屏广告、设置弹窗、抖音添加桌面、订阅消息以及侧边栏快捷入口）。

`StarterGame.ts` 是项目唯一的游戏主入口。场景中的 `Canvas` 挂载 `StarterGame` 组件，`StarterGame` 继承 `BasePageGameController`。开发新游戏时，直接在 `StarterGame` 中编写玩法逻辑或挂载业务组件即可。

---

## 1. 框架结构分层

### gameCommon：业务封装层
面向业务开发，将平台能力、UI、存储与弹窗整合好，开箱即用：
- **BasePageGameController**：页面容器管理（`createPage`）与页面状态切换。
- **TopBar**：通用顶栏组件，管理左上角设置按钮（添加桌面/订阅消息）以及左下角侧边栏快捷入口。
- **CoverRenderer**：封面立体艺术字标题、动效与开始游戏按钮。
- **RewardedAdGameService**：广告完整观看后安全发奖的激励广告统一服务。

### framework：底层能力支撑
提供核心系统与小游戏平台原生接口对接：
- **ad**：`RewardedVideoAdService`（激励视频）、`InterstitialAdService`（插屏）、`SidebarService`（侧边栏）、`OpenAbilityService`（添加到桌面、订阅消息）。
- **core**：`GameStorage`（本地键值存储）。
- **ui**：UI 样式定义与工厂（`IUISkin`、`PuzzleStorySkin`、`UIHelper` 等）。
- **common**：`SpriteAnimation`（精灵帧动画播放）、`SpriteRegisterPlay`。

---

## 2. 主入口 StarterGame

精简后 `StarterGame.ts` 的代码结构非常清晰：

~~~ts
import { _decorator, Node, Size, view } from 'cc';
import { IUISkin } from './framework/ui/IUISkin';
import { PuzzleStorySkin } from './framework/ui/impl/PuzzleStorySkin';
import { BaseGameState } from './gameCommon/BaseGameController';
import { BasePageGameController } from './gameCommon/BasePageGameController';
import { TopBar } from './gameCommon/pageRender/TopBar';

const { ccclass } = _decorator;

@ccclass('StarterGame')
export class StarterGame extends BasePageGameController {
  protected readonly uiSkins: readonly IUISkin[] = [new PuzzleStorySkin()];
  protected readonly skin: IUISkin = this.uiSkins[0];

  // 封面上挂载公共顶栏（设置和侧边栏入口）
  protected renderCoverExtras(root: Node, size: Size) {
    TopBar.attach(root, this.skin).render(size);
  }

  // 封面点击“开始游戏”，直接进入玩法
  protected onCoverStart() {
    this.showPlay(1);
  }

  // 核心玩法页面入口
  protected showPlay(level = 1) {
    this.setState(BaseGameState.Playing);
    const size = view.getVisibleSize();
    // 创建纯净玩法页面根节点
    const root = this.createPage('PlayPage');

    // 在这里挂载你的具体游戏逻辑组件
  }
}
~~~

---

## 3. 页面生命周期与启动流程

### 3.1 启动流转
~~~text
场景 Canvas 上的 StarterGame
  └─ BaseGameController.start()
       ├─ rewardedVideoAd.init()     // 预加载激励广告
       └─ BasePageGameController.bootstrap()
            └─ showCover()            // 展示封面
                 ├─ renderCoverExtras() -> TopBar 挂载顶栏
                 └─ 点击“开始游戏” -> onCoverStart() -> showPlay() 直接进入玩法
~~~

### 3.2 游戏状态枚举 (BaseGameState)
- `Boot`：启动中
- `Cover`：封面主界面
- `Playing`：核心玩法进行中
- `Paused`：暂停
- `GameOver`：失败结算
- `Victory`：胜利结算

通过 `this.setState(BaseGameState.Playing)` 进行状态切换。子类可以重写 `onEnterState`、`onLeaveState`、`onUpdatePlaying(dt)` 等状态钩子。

---

## 4. 公共顶栏组件 TopBar

### 4.1 挂载与功能
在任意页面根节点调用：
~~~ts
TopBar.attach(root, this.skin).render(size);
~~~
挂载后即可获得：
1. **设置弹窗**：支持添加到桌面快捷方式、订阅消息通知。
2. **侧边栏快捷入口**：自动探测宿主平台是否支持抖音首页侧边栏，支持快捷跳转引导（纯功能入口，无任何领奖与打扰弹窗）。

---

## 5. 激励广告服务 RewardedAdGameService

调用方式极简，所有需要看激励视频的地方统一调用 `rewardedAdGameService.show`：
~~~ts
import { rewardedAdGameService } from './gameCommon/services/RewardedAdGameService';

// 展示激励广告并执行发奖回调
await rewardedAdGameService.show('double-score', () => {
  // 仅在广告完整播放后，才会执行此回调
  this.addScoreReward();
});
~~~
特点：
- **开发环境自动放行**：在未接入广告 SDK 或本地调试时自动放行奖励（由 `baseGameConfig.adConfig.rewardedAdDebugFallbackEnabled` 控制）。

---

## 6. 全局配置 (baseGameConfig.ts)

精简后的配置文件位于 `assets/script/config/baseGameConfig.ts`：
~~~ts
export const baseGameConfig = {
  gameTitle: '游戏名称测试1',       // 封面主标题艺术字
  showAdvice: false,              // 封面是否显示健康游戏忠告
  storageKeyPrefix: 'save_game',  // 本地存储 key 前缀，隔离不同项目

  adConfig: {
    rewardedVideoAdUnitId: '9f6d1j81okc5m2cmi1', // 激励广告位 ID
    rewardedAdDebugFallbackEnabled: true,
    interstitialAdUnitId: 'replace-with-your-ad-unit-id',
    subscribeMessageEnabled: false,              // 消息订阅开关
    subscribeMessageTemplateIds: ['123'],
  },
} as const;
~~~
