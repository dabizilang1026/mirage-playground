import Phaser from 'phaser';
import './style.css';
import { director } from './game/director';
import { Shell } from './ui/shell';
import { installErrorReporter } from './ui/errorReporter';
import { BootScene } from './phaser/scenes/BootScene';
import { TitleScene } from './phaser/scenes/TitleScene';
import { HubScene } from './phaser/scenes/HubScene';
import { CleaningScene } from './phaser/scenes/CleaningScene';
import { BlackjackScene } from './phaser/scenes/BlackjackScene';
import { RpsScene } from './phaser/scenes/RpsScene';
import { SwordScene } from './phaser/scenes/SwordScene';
import { RouletteScene } from './phaser/scenes/RouletteScene';
import { TarotScene } from './phaser/scenes/TarotScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'phaser-root',
  transparent: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  render: {
    antialias: true,
    roundPixels: false,
  },
  fps: {
    target: 60,
    smoothStep: true,
  },
  scene: [
    BootScene,
    TitleScene,
    HubScene,
    CleaningScene,
    BlackjackScene,
    RpsScene,
    SwordScene,
    RouletteScene,
    TarotScene,
  ],
};

installErrorReporter();
const game = new Phaser.Game(config);

const shell = new Shell({
  onConfirmAdult: () => director.goToSaves(),
  onOpenSave: (id) => director.openSave(id),
  onCreateSave: (name, diff) => director.createSave(name, diff),
  onDeleteSave: (id) => director.deleteSave(id),
  onPlay: (key) => director.play(key),
  onBackToSaves: () => director.goToSaves(),
  onBuySkin: (id) => director.buySkin(id),
  onEquipSkin: (id) => director.equipSkin(id),
  onCheatAdd: (amount) => director.cheatAdd(amount),
  onLeaveGame: () => director.exitToHub(),
});

director.bindGame(game);
director.bindShell(shell);
director.startTitle();

game.scene.start('BootScene');

// 调试钩子（供自动化测试检查内部状态）
const win = window as unknown as {
  __game?: Phaser.Game;
  __director?: typeof director;
};
win.__game = game;
win.__director = director;
