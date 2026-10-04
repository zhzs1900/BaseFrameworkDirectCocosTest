import { resources, Texture2D, error } from 'cc';
import { SpriteAnimation } from './SpriteAnimation';
import { SpriteRegisterConfig } from '../../config/SpriteRegisterConfig';

/**
 * 精灵配置播放工具类
 * 负责解析配置并驱动 SpriteAnimation 组件进行播放
 */
export class SpriteRegisterPlay {
    /**
     * 根据配置路径播放动画
     * @param animation SpriteAnimation 组件实例
     * @param configPath 配置路径，格式为 "SpriteKey.DisplayKey" (例如: "animation1.fullPlay")
     */
    public static play(animation: SpriteAnimation, configPath: string) {
        if (!animation) {
            error('[SpriteRegisterPlay] Animation component is null.');
            return;
        }

        const parts = configPath.split('.');
        if (parts.length !== 2) {
            error(`[SpriteRegisterPlay] 路径格式错误: ${configPath}。应为 "资源Key.操作Key"`);
            return;
        }

        const spriteKey = parts[0];
        const displayKey = parts[1];

        // 获取基础配置
        const spriteConfig = (SpriteRegisterConfig as any)[spriteKey];
        if (!spriteConfig) {
            error(`[SpriteRegisterPlay] 未找到资源配置: ${spriteKey}`);
            return;
        }

        // 获取具体的播放/展示配置
        const displayConfig = spriteConfig.displays[displayKey];
        if (!displayConfig) {
            error(`[SpriteRegisterPlay] 未在 ${spriteKey} 下找到展示配置: ${displayKey}`);
            return;
        }

        // 加载纹理资源
        // PNG 的 Texture2D 是图片资源下名为 texture 的子资源；与 UIHelper
        // 加载普通图片时使用 /spriteFrame 的方式保持一致。
        const texturePath = `${spriteConfig.path}/texture`;
        resources.load(texturePath, Texture2D, (err: Error | null, texture: Texture2D) => {
            if (err) {
                error(`[SpriteRegisterPlay] 加载纹理失败: ${texturePath}`, err);
                return;
            }

            if (!animation || !animation.isValid) return;

            // 设置组件基础参数
            animation.texture = texture;
            animation.totalRows = spriteConfig.totalRows;
            animation.totalCols = spriteConfig.totalCols;

            // 根据配置类型执行对应的播放方法
            const { type, scale } = displayConfig;
            const loop = displayConfig.loop ?? true;

            switch (type) {
                case 'playAnimation':
                    animation.playAnimation(
                        displayConfig.rowIndex,
                        loop,
                        displayConfig.frameCount,
                        scale
                    );
                    break;
                case 'playAnimationRange':
                    animation.playAnimationRange(
                        displayConfig.startRow,
                        displayConfig.startCol,
                        displayConfig.endRow,
                        displayConfig.endCol,
                        loop,
                        scale
                    );
                    break;
                case 'showStaticFrame':
                    animation.showStaticFrame(
                        displayConfig.rowIndex,
                        displayConfig.colIndex,
                        scale
                    );
                    break;
                default:
                    error(`[SpriteRegisterPlay] 未知的配置类型: ${type}`);
                    break;
            }
        });
    }
}
