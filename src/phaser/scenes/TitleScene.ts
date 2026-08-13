import Phaser from 'phaser';
import { addDriftOrbs, addEmbers } from '../fx';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    addDriftOrbs(this, 9);
    addEmbers(this, 30);
  }
}
