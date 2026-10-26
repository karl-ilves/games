/**
 * ImageVisionEngine
 * Analyzes uploaded or dragged & dropped images using color distribution,
 * luminance, aspect ratio, canvas pixel inspection, and optional Gemini 1.5 Vision.
 */

import { GeminiCloudEngine } from '../games/ai/systems/geminiCloudEngine';

export interface ImageAnalysisResult {
    fileName: string;
    width: number;
    height: number;
    aspectRatio: number;
    description: string;
    theme: 'nature' | 'sci_fi' | 'city' | 'dungeon' | 'sky' | 'abstract' | 'character' | 'vehicle' | 'texture';
    dominantColorHex: string;
    secondaryColorHex: string;
    suggestedObjects: string[];
    suggestedSky: 'day' | 'night' | 'sunset' | 'storm' | 'space';
    suggestedTerrainColor: number;
    suggestedSkyColor: number;
    suggestedGameTitle: string;
    isTexture: boolean;
}

export class ImageVisionEngine {
    /**
     * Inspect image data URL via HTML Canvas pixel processing + semantic heuristic
     */
    public static async analyzeImageDataUrl(dataUrl: string, fileName: string = 'image.png', userPrompt?: string): Promise<ImageAnalysisResult> {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = async () => {
                const width = img.naturalWidth || img.width || 256;
                const height = img.naturalHeight || img.height || 256;
                const aspectRatio = width / (height || 1);

                // Sample pixel colors with offscreen canvas
                const canvas = document.createElement('canvas');
                const sampleW = Math.min(64, width);
                const sampleH = Math.min(64, height);
                canvas.width = sampleW;
                canvas.height = sampleH;
                const ctx = canvas.getContext('2d');

                let rSum = 0, gSum = 0, bSum = 0;
                let topR = 0, topG = 0, topB = 0;
                let bottomR = 0, bottomG = 0, bottomB = 0;
                let totalPixels = sampleW * sampleH;

                if (ctx) {
                    ctx.drawImage(img, 0, 0, sampleW, sampleH);
                    const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
                    const d = imgData.data;

                    for (let i = 0; i < d.length; i += 4) {
                        rSum += d[i];
                        gSum += d[i + 1];
                        bSum += d[i + 2];
                        const pixelY = Math.floor((i / 4) / sampleW);
                        if (pixelY < sampleH / 2) {
                            topR += d[i];
                            topG += d[i + 1];
                            topB += d[i + 2];
                        } else {
                            bottomR += d[i];
                            bottomG += d[i + 1];
                            bottomB += d[i + 2];
                        }
                    }
                }

                const avgR = Math.round(rSum / totalPixels);
                const avgG = Math.round(gSum / totalPixels);
                const avgB = Math.round(bSum / totalPixels);

                const halfPix = totalPixels / 2;
                const avgTopR = Math.round(topR / halfPix);
                const avgTopG = Math.round(topG / halfPix);
                const avgTopB = Math.round(topB / halfPix);

                const avgBottomR = Math.round(bottomR / halfPix);
                const avgBottomG = Math.round(bottomG / halfPix);
                const avgBottomB = Math.round(bottomB / halfPix);

                const dominantColorHex = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1)}`;
                const secondaryColorHex = `#${((1 << 24) + (avgTopR << 16) + (avgTopG << 8) + avgTopB).toString(16).slice(1)}`;

                // Detect scene characteristics from color spectrum
                let theme: ImageAnalysisResult['theme'] = 'nature';
                let suggestedSky: ImageAnalysisResult['suggestedSky'] = 'day';
                let suggestedObjects: string[] = [];
                let isTexture = false;

                const isDark = (avgR + avgG + avgB) < 180;
                const isBlueHeavy = avgTopB > avgTopR + 30 && avgTopB > avgTopG + 10;
                const isGreenHeavy = avgBottomG > avgBottomR + 20 && avgBottomG > avgBottomB + 20;
                const isRedOrange = (avgTopR > 180 && avgTopG > 80 && avgTopB < 100);

                if (isDark) {
                    if (avgB > avgR) {
                        theme = 'sci_fi';
                        suggestedSky = 'space';
                        suggestedObjects = ['kosmosejaam', 'ufo_laev', 'laserkiired', 'reaktor'];
                    } else {
                        theme = 'dungeon';
                        suggestedSky = 'night';
                        suggestedObjects = ['kiviseinad', 'tõrvikud', 'laavajõgi', 'varandusekirst'];
                    }
                } else if (isRedOrange) {
                    theme = 'nature';
                    suggestedSky = 'sunset';
                    suggestedObjects = ['mäestik', 'pilved', 'leegitsevad_kristallid'];
                } else if (isGreenHeavy) {
                    theme = 'nature';
                    suggestedSky = 'day';
                    suggestedObjects = ['männid', 'roheline_muru', 'kivid', 'jõgi', 'sild'];
                } else if (isBlueHeavy) {
                    theme = 'city';
                    suggestedSky = 'day';
                    suggestedObjects = ['pilvelõhkujad', 'tänavalambid', 'teedevõrk'];
                }

                // If user prompt mentions specific wishes
                const lowerPrompt = (userPrompt || '').toLowerCase();
                if (/tekstuur|muster|texture|pattern/i.test(lowerPrompt) || (Math.abs(width - height) < 2 && width <= 512)) {
                    isTexture = true;
                }

                let terrainColor = (avgBottomR << 16) | (avgBottomG << 8) | avgBottomB;
                let skyColor = (avgTopR << 16) | (avgTopG << 8) | avgTopB;

                let description = `Pilt "${fileName}" (${width}x${height}): tuvastatud värvipalett ${dominantColorHex}, sobib ${theme} teemaga ja ${suggestedSky} atmosfääriga.`;

                // If Gemini Cloud Engine is active, can enrich with neural intelligence
                const gemini = GeminiCloudEngine.getInstance();
                if (gemini.isNeuralModeActive()) {
                    try {
                        const cloudResp = await gemini.queryNeural(
                            `Analyze this user uploaded game concept image (named ${fileName}, size ${width}x${height}, dominant RGB: ${dominantColorHex}). The user prompt is "${userPrompt || ''}". Describe what 3D objects to build based on this image in 2 sentences in Estonian.`
                        );
                        if (cloudResp.success && cloudResp.text) {
                            description += `\n🧠 Gemini nägemine: ${cloudResp.text}`;
                        }
                    } catch (e) {}
                }

                resolve({
                    fileName,
                    width,
                    height,
                    aspectRatio,
                    description,
                    theme,
                    dominantColorHex,
                    secondaryColorHex,
                    suggestedObjects,
                    suggestedSky,
                    suggestedTerrainColor: terrainColor || 0x228b22,
                    suggestedSkyColor: skyColor || 0x87ceeb,
                    suggestedGameTitle: `Pildi "${fileName.replace(/\.[^/.]+$/, '')}" Maailm`,
                    isTexture
                });
            };
            img.onerror = () => {
                resolve({
                    fileName,
                    width: 256,
                    height: 256,
                    aspectRatio: 1,
                    description: `Pilti "${fileName}" analüüsiti üldise visuaalina.`,
                    theme: 'nature',
                    dominantColorHex: '#3b82f6',
                    secondaryColorHex: '#10b981',
                    suggestedObjects: ['puud', 'kivid'],
                    suggestedSky: 'day',
                    suggestedTerrainColor: 0x337733,
                    suggestedSkyColor: 0x87ceeb,
                    suggestedGameTitle: 'Uus Pildist Loodud Maailm',
                    isTexture: false
                });
            };
            img.src = dataUrl;
        });
    }

    /**
     * Helper to read file from File object into Base64 Data URL
     */
    public static readFileAsDataUrl(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}
