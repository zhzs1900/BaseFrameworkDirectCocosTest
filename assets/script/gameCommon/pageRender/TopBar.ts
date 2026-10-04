import { _decorator, Button, Color, Component, Node, Size, UITransform } from 'cc';
import { IUISkin } from '../../framework/ui/IUISkin';
import { baseGameConfig } from '../../config/baseGameConfig';
import { openAbilityService } from '../../framework/ad/OpenAbilityService';
import { sidebarService } from '../../framework/ad/SidebarService';
import { GameStorage } from '../../framework/core/GameStorage';

// 开放能力类型
export type OpenType = 'desktopShortcut' | 'subscribeMessage';

const { ccclass } = _decorator;

// 界面通用顶栏，负责设置弹窗以及侧边栏快捷入口
@ccclass('TopBar')
export class TopBar extends Component {
  private skin!: IUISkin;
  // 本地存储
  private readonly storage = new GameStorage(baseGameConfig.storageKeyPrefix);
  
  // 侧边栏按钮
  private sideButton: Node | null = null;
  // 侧边栏弹窗节点
  private sideDialog: Node | null = null;
  // 挂载的页面根节点
  private viewRoot: Node | null = null;
  // 是否已注册侧边栏状态监听
  private hasListener = false;

  // 便捷挂载方法，加到页面根节点
  static attach(root: Node, skin: IUISkin) {
    const bar = root.addComponent(TopBar);
    bar.skin = skin;
    return bar;
  }

  // 绘制顶栏控件
  render(size: Size) {
    const root = this.node;
    this.viewRoot = root;

    // 1. 左上角设置按钮
    const settingBtn = this.skin.createButton('SettingBtn', '⚙ 设置', {
      width: 104,
      height: 52,
      fontSize: 18,
      variant: 'quiet',
      onClick: () => this.openSetting(root),
    });
    settingBtn.setPosition(-size.width / 2 + 66, size.height / 2 - 76);
    root.addChild(settingBtn);

    // 2. 左下角侧边栏快捷入口
    const sideNode = new Node('SideBtn');
    sideNode.addComponent(UITransform).setContentSize(100, 110);
    sideNode.addChild(this.skin.createImage('SideIcon', 'ui/icon', 76, 76));

    const sideText = this.skin.createText('SideText', '侧边栏', { fontSize: 16, bold: true });
    sideText.setPosition(0, -48);
    sideNode.addChild(sideText);

    sideNode.setPosition(-size.width / 2 + 62, -size.height / 2 + 82);
    root.addChild(sideNode);
    sideNode.active = sidebarService.isSupported();
    this.sideButton = sideNode;

    // 绑定点击与缩放手感
    sideNode.addComponent(Button).transition = Button.Transition.SCALE;
    sideNode.on(Button.EventType.CLICK, () => this.openSideDialog(root));

    // 监听环境变化
    if (!this.hasListener) {
      sidebarService.onChange(this.onSideChanged);
      this.hasListener = true;
    }
    this.onSideChanged();
  }

  onDestroy() {
    // 销毁时注销监听
    if (this.hasListener) {
      sidebarService.offChange(this.onSideChanged);
      this.hasListener = false;
    }
  }

  // 侧边栏状态变动响应，从侧边栏启动时自动给予“添加成功”的正向反馈
  private readonly onSideChanged = () => {
    if (this.sideButton?.isValid) {
      this.sideButton.active = sidebarService.isSupported();
    }

    // 检测到玩家从侧边栏唤醒进入，且尚未给予过成功反馈，弹出提示
    if (this.viewRoot?.isValid && sidebarService.isLaunchedFromSidebar() && !this.storage.getBool('sidebar-added-toast')) {
      this.storage.setBool('sidebar-added-toast', true);
      this.showNotice(this.viewRoot, '添加成功！\n已成功从首页侧边栏启动游戏，下次可随时在侧边栏快速进入。', true);
    }
  };

  // 弹出侧边栏引导与状态展示弹窗（纯快捷功能，无任何发奖）
  private openSideDialog(parent: Node) {
    if (this.sideDialog?.isValid) { return; }
    const win = this.skin.createWindow(parent, 'SideGuideWin', { width: 500, height: 540 });
    this.sideDialog = win.overlay;
    const body = win.content;
    const closeWin = () => {
      win.close();
      this.sideDialog = null;
    };

    const isAdded = sidebarService.isLaunchedFromSidebar();

    // 弹窗标题
    const title = this.skin.createText('SideTitle', isAdded ? '已在侧边栏' : '添加到侧边栏', { fontSize: 29, bold: true });
    title.setPosition(0, 220);
    body.addChild(title);

    // 游戏图标展示
    const iconFrame = this.skin.createPanel('SideIconBox', { width: 136, height: 136, radius: 24 });
    iconFrame.setPosition(0, 115);
    body.addChild(iconFrame);
    iconFrame.addChild(this.skin.createImage('SideIcon', 'ui/icon', 120, 120));

    // 说明提示
    const tipText = this.skin.createText('SideTip', isAdded ? '✓ 本游戏已成功加入侧边栏！' : '将游戏添加到首页侧边栏，下次启动更方便！', {
      fontSize: 17, bold: true, color: isAdded ? new Color(54, 137, 91, 255) : new Color(190, 95, 38, 255),
    });
    tipText.setPosition(0, 25);
    body.addChild(tipText);

    // 引导步骤
    const stepsBox = this.skin.createPanel('SideStepsBox', { width: 420, height: 90, radius: 14 });
    stepsBox.setPosition(0, -55);
    body.addChild(stepsBox);
    (isAdded
      ? ['1. 可以在抖音首页左侧侧边栏中随时找到本游戏', '2. 点击卡片即可一键直接启动，畅玩无需等待']
      : ['1. 点击下方“前往首页侧边栏”', '2. 在侧边栏中点击本游戏即可快捷加入']
    ).forEach((text, i) => {
      const line = this.skin.createText(`SideStep${i + 1}`, text, { fontSize: 16 });
      line.setPosition(0, 18 - i * 32);
      stepsBox.addChild(line);
    });

    // 前往侧边栏按钮 / 状态展示
    const goBtn = this.skin.createButton('SideGoBtn', isAdded ? '已添加成功' : '前往首页侧边栏', {
      width: 260, height: 58, fontSize: 19, variant: isAdded ? 'quiet' : 'primary',
      onClick: () => {
        closeWin();
        if (!isAdded) {
          void sidebarService.navigate();
        }
      },
    });
    goBtn.setPosition(0, -145);
    body.addChild(goBtn);

    // 关闭按钮
    const closeBtn = this.skin.createButton('SideCloseBtn', '关闭', {
      width: 150, height: 48, fontSize: 17, variant: 'quiet', onClick: closeWin,
    });
    closeBtn.setPosition(0, -215);
    body.addChild(closeBtn);
  }

  // 打开游戏设置面板
  openSetting(parent: Node) {
    const subEnabled = baseGameConfig.adConfig.subscribeMessageEnabled;
    const win = this.skin.createWindow(parent, 'SettingWin', { width: 500, height: subEnabled ? 500 : 420 });
    const body = win.content;

    // 标题
    const title = this.skin.createText('SettingTitle', '设置', { fontSize: 36, bold: true });
    title.setPosition(0, subEnabled ? 185 : 145);
    body.addChild(title);

    // 副标题
    const subTitle = this.skin.createText('SettingSub', '调整你的快捷体验', {
      fontSize: 17,
      color: this.skin.palette.mutedText,
    });
    subTitle.setPosition(0, subEnabled ? 145 : 105);
    body.addChild(subTitle);

    // 添加桌面快捷方式
    this.addAbilityRow(body, parent, 'DeskOpt', '添加到桌面', '立即添加', subEnabled ? 65 : 20, 'desktopShortcut', win.close);

    // 消息订阅开关
    if (subEnabled) {
      this.addAbilityRow(body, parent, 'SubOpt', '消息提醒', '立即开启', -15, 'subscribeMessage', win.close);
    }

    // 平台提示
    const tipNode = this.skin.createText('SettingTip', '开放能力需在抖音小游戏中使用', {
      fontSize: 15,
      color: this.skin.palette.mutedText,
    });
    tipNode.setPosition(0, subEnabled ? -100 : -65);
    body.addChild(tipNode);

    // 关闭按钮
    const closeBtn = this.skin.createButton('CloseSettingBtn', '关闭', {
      width: 210,
      height: 56,
      fontSize: 20,
      variant: 'primary',
      onClick: win.close,
    });
    closeBtn.setPosition(0, subEnabled ? -175 : -140);
    body.addChild(closeBtn);
  }

  // 开放能力调用行
  private addAbilityRow(parent: Node, tipParent: Node, name: string, titleText: string, btnText: string, y: number,
    type: OpenType, closeWin: () => void) {
    const row = this.skin.createPanel(name, { width: 410, height: 70, radius: 18 });
    row.setPosition(0, y);
    parent.addChild(row);

    const title = this.skin.createText(`${name}Title`, titleText, { fontSize: 20, bold: true });
    title.setPosition(-92, 0);
    row.addChild(title);

    const btn = this.skin.createButton(`${name}Action`, btnText, {
      width: 126, height: 46, fontSize: 16, variant: 'secondary',
      onClick: () => {
        const req = this.doOpenAbility(type);
        void req.then((res) => {
          closeWin();
          this.showNotice(tipParent, res.msg, res.ok);
        });
      },
    });
    btn.setPosition(125, 0);
    row.addChild(btn);
  }

  // 调起开放能力
  private async doOpenAbility(type: OpenType) {
    const res = type === 'desktopShortcut'
      ? await openAbilityService.addShortcut()
      : await openAbilityService.requestSubscribeMessage();
    return { ok: res.succeeded, msg: res.message };
  }

  // 通用提示弹窗
  private showNotice(parent: Node, msg: string, ok: boolean) {
    const win = this.skin.createWindow(parent, 'NoticeWin', { width: 440, height: 260 });
    const title = this.skin.createText('NoticeTitle', ok ? '操作成功' : '温馨提示', {
      fontSize: 30, bold: true, color: ok ? new Color(54, 137, 91, 255) : this.skin.palette.ink,
    });
    title.setPosition(0, 72);
    win.content.addChild(title);

    msg.split('\n').slice(0, 3).forEach((line, i, list) => {
      const lineNode = this.skin.createText(`NoticeLine${i}`, line, { fontSize: 17 });
      lineNode.setPosition(0, 22 + ((list.length - 1) * 12) - i * 25);
      win.content.addChild(lineNode);
    });

    const okBtn = this.skin.createButton('NoticeOkBtn', '知道了', {
      width: 160, height: 50, fontSize: 18, variant: 'primary', onClick: win.close,
    });
    okBtn.setPosition(0, -76);
    win.content.addChild(okBtn);
  }
}
