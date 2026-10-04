import { baseGameConfig } from '../../config/baseGameConfig';

// 抖音平台插屏广告实例结构
interface InterstitialAdInstance {
  load?(): Promise<void>;
  show(): Promise<void>;
  onClose(callback: () => void): void;
  offClose?(callback: () => void): void;
  onError(callback: (error: unknown) => void): void;
  offError?(callback: (error: unknown) => void): void;
  destroy?(): void;
}

// 抖音全局 tt 对象上的插屏广告 API
interface InterstitialApi {
  createInterstitialAd?(options: { adUnitId: string }): InterstitialAdInstance;
}

// 默认的占位广告位 ID，没配真实 ID 时就当作不可用
const PLACEHOLDER = 'replace-with-your-ad-unit-id';

/**
 * 抖音插屏广告管理类
 * 负责插屏广告的创建、加载、防重复点击与播放回调处理
 */
class InterstitialAdService {
  // 缓存创建好的广告实例，避免每次都重新 new
  private ad: InterstitialAdInstance | null = null;
  // 记录当前正在弹出的展示任务，防止短时间内重复调用
  private showing: Promise<boolean> | null = null;

  /**
   * 检查当前环境是否支持插屏广告
   * 必须在抖音环境并且配置了有效的广告位 ID 才算可用
   */
  isAvailable(): boolean {
    const tt = this.getApi();
    const id = baseGameConfig.adConfig.interstitialAdUnitId.trim();
    return !!tt?.createInterstitialAd && !!id && id !== PLACEHOLDER;
  }

  /**
   * 播放插屏广告
   * @param placement 播放位置/打点标识（如：'gameOver', 'levelPass'）
   * @returns 返回是否播放成功
   */
  show(placement: string): Promise<boolean> {
    // 如果已经有一个插屏正在展示或拉取中，直接复用当前 Promise，防止并发连点
    if (this.showing) { return this.showing; }
    
    // 环境不支持或没配 ID 就直接跳过
    if (!this.isAvailable()) {
      console.info(`[InterstitialAd] ${placement}: API 或广告位未配置。`);
      return Promise.resolve(false);
    }

    const request = this.showInternal(placement);
    this.showing = request;
    // 播放完成后清理标记，允许下一次播放
    void request.then(() => { if (this.showing === request) { this.showing = null; } });
    return request;
  }

  /**
   * 销毁广告实例，释放内存
   */
  destroy(): void {
    this.ad?.destroy?.();
    this.ad = null;
  }

  /**
   * 内部处理具体的广告创建与展示逻辑
   */
  private showInternal(placement: string): Promise<boolean> {
    // 第一次调用时创建广告实例
    try {
      if (!this.ad) {
        this.ad = this.getApi()!.createInterstitialAd!({ adUnitId: baseGameConfig.adConfig.interstitialAdUnitId });
      }
    } catch (error) {
      console.warn(`[InterstitialAd] ${placement}: 创建失败。`, error);
      return Promise.resolve(false);
    }

    const ad = this.ad;
    return new Promise((resolve) => {
      let settled = false;

      // 统一收尾函数，移除监听并返回结果
      const finish = (succeeded: boolean) => {
        if (settled) { return; }
        settled = true;
        ad.offClose?.(onClose);
        ad.offError?.(onError);
        resolve(succeeded);
      };

      // 玩家关掉插屏算展示成功
      const onClose = () => finish(true);
      
      // 加载或展示报错
      const onError = (error: unknown) => {
        console.warn(`[InterstitialAd] ${placement}: 展示失败。`, error);
        finish(false);
      };

      // 绑定关闭和报错事件
      ad.onClose(onClose);
      ad.onError(onError);

      // 尝试展示；如果支持 load 就先 load 再 show，否则直接 show
      const show = () => ad.show().catch(onError);
      if (ad.load) { 
        void ad.load().then(show).catch(onError); 
      } else { 
        void show(); 
      }
    });
  }

  /**
   * 获取全局的抖音 tt 环境对象
   */
  private getApi(): InterstitialApi | null {
    return (globalThis as unknown as { tt?: InterstitialApi }).tt ?? null;
  }
}

// 导出单例，全局直接调用
export const interstitialAd = new InterstitialAdService();
