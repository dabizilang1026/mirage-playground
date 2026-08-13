import Phaser from 'phaser';
import { addDriftOrbs, addEmbers } from '../fx';

export class HubScene extends Phaser.Scene {
  constructor() {
    super('HubScene');
  }

  create(): void {
    addDriftOrbs(this, 6);
    addEmbers(this, 22);
  }
}
