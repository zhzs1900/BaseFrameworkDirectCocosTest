import { rewardedVideoAd } from '../../framework/ad/RewardedVideoAdService';

// 游戏层统一激励广告服务入口
// 统一调用 show()，确保用户看完广告后才发放业务奖励
export class RewardedAdGameService {
  private busy = false;

  async show(placement: string, onGranted: () => void | Promise<void> = () => undefined): Promise<boolean> {
    if (this.busy) { return false; }
    this.busy = true;
    try {
      const granted = await rewardedVideoAd.show(placement);
      if (!granted) { return false; }
      await onGranted();
      return true;
    } finally {
      this.busy = false;
    }
  }
}

// 全游戏共享单例
export const rewardedAdGameService = new RewardedAdGameService();
