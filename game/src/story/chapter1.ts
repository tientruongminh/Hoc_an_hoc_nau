import Phaser from 'phaser';
import type { ExitDef } from '../data/maps';
import type { Line } from '../data/speakers';
import type { WorldScene } from '../scenes/WorldScene';
import { ui } from '../scenes/UIScene';
import { G, type EndingId, type Resume } from '../state/GameState';
import { music, sfx } from '../systems/Audio';
import type { MinigameId, MinigameResults } from '../systems/Flow';

/**
 * Chapter 1 script: per-map setup by story stage, exit gating and minigame
 * routing. Dialogue follows docs/design-source/chap1.docx.
 */

type Who = Exclude<Line, string>['who'];
const L = (who: Who, text: string, face?: string, shake?: boolean): Line => ({ who, text, face, shake });

const SHARDS: [number, number][] = [
  [70, 125],
  [112, 116],
  [252, 128],
  [266, 214],
  [92, 238],
];
const DEBRIS: [number, number][] = [
  [124, 134],
  [228, 226],
  [60, 222],
  [276, 168],
];
const STOOLS: [number, number][] = [
  [200, 214],
  [158, 122],
  [240, 122],
];
const DOORS = ['door_kitchen', 'win_kitchen', 'win_mom'] as const;

const n = (f: string) => Number(G.flag(f) ?? 0);
const doorsClosed = () => DOORS.filter((d) => G.flag(d)).length;

// ───────────────────────────── quest tracker ─────────────────────────────
export function questText(): string | null {
  switch (G.stage) {
    case 'intro':
      return 'Chạy xuống bếp xem mẹ bị sao!';
    case 'find_number':
      return G.has('notebook') ? 'Ra gian quán chờ ba về' : 'Tìm số điện thoại của ba trong phòng mẹ';
    case 'clean': {
      if (G.has('trash')) return 'Đem túi rác ra trước cửa quán';
      if (!G.flag('broom')) return 'Dọn mảnh vỡ trong bếp\n• Lấy chổi & hốt rác';
      return `Dọn mảnh vỡ trong bếp\n• Nhặt mảnh lớn (${n('shards')}/${SHARDS.length})\n• Quét vụn (${n('debris')}/${DEBRIS.length})`;
    }
    case 'wash':
      return 'Rửa chồng chén dĩa ở bồn rửa';
    case 'eggs':
      return `Ra vườn lấy trứng gà, nhớ chừa lại trứng trong ổ\n${G.d.grain ? '✓ Đã lấy thóc dụ ngỗng' : '• (Tùy chọn) Lấy thóc ở góc bếp'}`;
    case 'store_eggs':
      return 'Cất trứng lên kệ cạnh nồi cơm';
    case 'doors':
      return `Đóng hết cửa trước khi đi (${doorsClosed()}/3)\n• Dắt xe ra cửa quán, đi lấy thịt nhà bà 8`;
    case 'ba8':
      return G.has('meat') ? 'Chở thịt về nhà' : 'Lấy thịt ở quầy bà 8';
    case 'park':
      return 'Xem đám đông ở công viên';
    case 'return':
      return 'Về nhà';
    case 'tidy':
      return `Xếp lại các chồng ghế (${n('stools')}/${STOOLS.length})`;
    case 'cook':
      return 'Vào bếp, chiên cơm theo lời mẹ';
    default:
      return null;
  }
}
const refresh = (w: WorldScene, announce = false) => w.ui.quest(questText(), announce);

// ───────────────────────────── map setup ─────────────────────────────
export function setupMap(w: WorldScene) {
  const ev = w.data0.event;
  switch (w.mapId) {
    case 'bedroom':
      setupBedroom(w, ev);
      break;
    case 'kitchen':
      setupKitchen(w, ev);
      break;
    case 'front':
      setupFront(w, ev);
      break;
    case 'momroom':
      setupMomRoom(w);
      break;
    case 'garden':
      setupGarden(w, ev);
      break;
    case 'ba8':
      setupBa8(w, ev);
      break;
    case 'park':
      setupPark(w, ev);
      break;
  }
  refresh(w, !w.locked);
}

function setupBedroom(w: WorldScene, ev?: string) {
  w.addInteract({
    id: 'bed',
    x: 120,
    y: 190,
    label: 'Nằm thêm chút',
    use: () => w.ui.say(L('me', 'Không được, mẹ đang gặp chuyện!', 'shock')),
  });
  if (ev !== 'intro') return;
  void w.cutscene(async () => {
    w.player.setPosition(138, 196).face('left');
    await w.wait(500);
    await w.ui.caption('Học Ăn Học Nấu', 'Chương 1 · Mẹ ơi, con nấu!', 1800);
    await w.ui.say([
      'Nhà tôi có cái quán cơm nhỏ, trưa nào cũng bán, món thay đổi mỗi ngày.',
      'Có thể nói nhà tôi lúc nào cũng có cơm ăn — và người nấu, đương nhiên là bà Lan, mẹ tôi.',
      'Còn tôi? Học sinh lớp 11, đang tận hưởng những ngày hè vô lo vô nghĩ…',
    ]);
    await w.wait(400);
    sfx('dish_crash');
    w.cameras.main.shake(500, 0.012);
    w.ui.flash(0xffffff, 120);
    await w.wait(300);
    await w.ui.say(L('mom', 'ÁÁÁÁ!!!', 'pain', true));
    w.player.hop(8);
    w.player.emote('!');
    sfx('heartbeat', { volume: 0.6 });
    await w.wait(500);
    await w.ui.say(L('me', 'Có chuyện gì vậy mẹ?!', 'shock'));
    music('tension');
  });
}

function setupKitchen(w: WorldScene, ev?: string) {
  const st = G.stage;
  // broken dishes stay on the floor until the clean-up is done
  if (st === 'intro' || st === 'find_number' || (st === 'clean' && !G.has('trash') && !G.flag('cleaned'))) {
    w.addProp('shards', 'pr_shards', 100, 168, { flat: true });
  }

  if (st === 'intro') {
    void w.cutscene(async () => {
      music('tension');
      await w.player.walkTo(150, 210, 90);
      await w.ui.showCG('cg_mom_fall', 600);
      await w.ui.say([
        'Mẹ đang nằm giữa bếp, dưới sàn toàn mảnh chén đĩa vỡ.',
        L('me', 'Mẹ! Mẹ có sao không?!', 'shock'),
        L('mom', 'Đỡ mẹ dậy… mẹ còn đứng được. Mẹ còn phải chuẩn bị nguyên liệu để mai bán nữa…', 'pain'),
        L('me', 'Nhưng hình như vừa rồi con nghe tay mẹ kêu cái “rắc” kìa…', 'sad'),
        L('mom', '……', 'pain'),
        L('me', 'Để con đưa mẹ lên nhà, rồi kêu ba về chở mẹ đi khám. Còn lại để con làm cho.', 'neutral'),
      ]);
      await w.ui.fadeOut(500);
      await w.ui.hideCG(10);
      G.stage = 'find_number';
      G.checkpoint({ scene: 'World', data: { map: 'front', spawn: 'center', event: 'ask_number' } });
      w.scene.restart({ map: 'front', spawn: 'center', event: 'ask_number' });
    });
    return;
  }

  if (st === 'clean') setupCleaning(w);

  if (st === 'wash') {
    w.addInteract({
      id: 'sink',
      x: 118,
      y: 104,
      r: 28,
      label: 'Rửa chén',
      use: async () => {
        G.checkpoint({ scene: 'Wash' });
        await w.startScene('Wash');
      },
    });
  }
  if (st === 'wash' && ev === 'wash_done') {
    void w.cutscene(async () => {
      await w.wait(600);
      for (let i = 0; i < 2; i++) {
        sfx('phone_ring');
        w.player.emote('♪', 700);
        await w.wait(1100);
      }
      sfx('phone_pickup');
      await w.ui.say([
        L('me', 'Alo, con nghe nè mẹ.'),
        L('mom', 'Mẹ quên dặn con: ra sau vườn lấy trứng gà, nhớ chừa lại một hai trứng trong ổ.', 'neutral'),
        L('mom', 'Cẩn thận hai con ngỗng già đấy! Tụi nó dữ lắm. Có bao thóc ở góc bếp, rải cho tụi nó ăn là dụ được.', 'neutral'),
        L('mom', 'Xong rồi đi lấy thịt nhà bà 8 đầu ngõ.', 'neutral'),
        L('mom', 'Nhớ ĐÓNG KÍN CỬA NHÀ trước khi đi! Hổm nay xung quanh nhiều người lạ lắm đấy.', 'angry'),
        L('me', 'Dạ dạ, con nhớ rồi.', 'smug'),
      ]);
      G.stage = 'eggs';
      G.checkpoint({ scene: 'World', data: { map: 'kitchen', spawn: 'center' } });
      w.setExitVisible('kitchen_garden', true);
      setupKitchen(w);
      refresh(w, true);
    });
  }

  if (st === 'eggs' && !G.d.grain) {
    w.addProp('grain', 'pr_grain', 284, 246, { solid: false });
    w.addInteract({
      id: 'grain',
      x: 284,
      y: 238,
      label: 'Lấy thóc',
      use: async () => {
        G.d.grain = true;
        sfx('grain_scatter');
        w.removeProp('grain');
        w.removeInteract('grain');
        w.ui.toast('Nhận được: Nắm thóc (Q để rải khi bị ngỗng đuổi)', 'pr_grain');
        refresh(w);
      },
    });
  }

  if (st === 'store_eggs') {
    w.addInteract({
      id: 'store',
      x: 268,
      y: 104,
      r: 30,
      label: 'Cất trứng',
      use: async () => {
        sfx('egg_collect');
        w.ui.toast(`Đã cất ${G.d.eggs} quả trứng`, 'it_egg2');
        G.stage = 'doors';
        w.ui.questDone();
        // "doors" slot: the robbed ending retries from here, before leaving home
        const r: Resume = { scene: 'World', data: { map: 'kitchen', spawn: 'center' } };
        G.checkpoint(r, '.doors');
        G.checkpoint(r);
        await w.ui.say(L('me', 'Xong vụ trứng. Giờ đóng cửa nẻo rồi đi lấy thịt.', 'smug'));
        setupKitchen(w);
        refresh(w, true);
      },
    });
  }

  if (st === 'doors') {
    closable(w, 'door_kitchen', 292, 130, 'Đóng cửa sau', () => {
      const g = w.add.graphics().setDepth(3);
      g.fillStyle(0x4a2d18).fillRect(300, 98, 18, 66);
      g.fillStyle(0x6b4426);
      for (let y = 100; y < 162; y += 8) g.fillRect(301, y, 16, 6);
      g.fillStyle(0xd9a441).fillRect(302, 128, 3, 3);
      w.setExitVisible('kitchen_garden', false);
    });
    closable(w, 'win_kitchen', 112, 104, 'Đóng cửa sổ', () => {
      w.add.image(112, 28, 'pr_shutter_closed').setDisplaySize(56, 28).setDepth(3);
    });
  }

  if (st === 'cook') {
    const mom = w.addNpc('mom', 'ch_momcast', 62, 116, 'down');
    w.addNpc('dad', 'ch_dad', 255, 200, 'left');
    w.addInteract({
      id: 'cook',
      x: 62,
      y: 112,
      r: 34,
      label: 'Bắt đầu nấu',
      use: async () => {
        mom.face('right');
        await w.ui.say(L('mom', 'Rồi, giờ làm theo lời mẹ. Sai một li là đi một dặm đó!', 'neutral'));
        G.checkpoint({ scene: 'Cooking' });
        await w.startScene('Cooking');
      },
    });
  }

  if (ev === 'tasting') void tasting(w, Number(w.data0.payload ?? 0));

  // the garden is only worth visiting once the eggs are needed
  const gardenOpen = ['eggs', 'store_eggs', 'doors'].includes(st) && !G.flag('door_kitchen');
  w.setExitVisible('kitchen_garden', gardenOpen);
}

function setupCleaning(w: WorldScene) {
  if (!G.flag('broom')) {
    w.addProp('broom', 'pr_broom', 40, 254);
    w.addInteract({
      id: 'broom',
      x: 40,
      y: 240,
      label: 'Lấy chổi & hốt rác',
      use: async () => {
        G.setFlag('broom');
        sfx('pickup');
        w.removeProp('broom');
        w.removeInteract('broom');
        w.ui.toast('Nhận được: Chổi & hốt rác', 'pr_broom');
        refresh(w);
      },
    });
  }
  const got = n('shards');
  SHARDS.forEach(([x, y], i) => {
    if (G.flag(`shard${i}`)) return;
    const id = `shard${i}`;
    const p = w.addProp(id, 'pr_shard_big', x, y);
    w.tweens.add({ targets: p, alpha: 0.75, yoyo: true, repeat: -1, duration: 500 + i * 60 });
    w.addInteract({
      id,
      x,
      y: y - 4,
      r: 20,
      label: 'Nhặt mảnh vỡ',
      when: () => !!G.flag('broom'),
      use: async () => {
        G.setFlag(id);
        G.setFlag('shards', n('shards') + 1);
        sfx('glass_clink', { detune: Phaser.Math.Between(-200, 200) });
        w.removeProp(id);
        w.removeInteract(id);
        checkClean(w);
      },
    });
  });
  void got;
  DEBRIS.forEach(([x, y], i) => {
    const id = `debris${i}`;
    if (G.flag(id)) return;
    w.addProp(id, 'pr_debris', x, y, { flat: true });
    w.addInteract({
      id,
      x,
      y: y - 2,
      r: 22,
      hold: 900,
      label: 'Giữ E để quét',
      when: () => !!G.flag('broom'),
      use: async () => {
        G.setFlag(id);
        G.setFlag('debris', n('debris') + 1);
        sfx('broom_sweep');
        dustPuff(w, x, y);
        w.removeProp(id);
        w.removeInteract(id);
        checkClean(w);
      },
    });
  });
  if (G.flag('cleaned') && !G.has('trash')) spawnTrash(w);
}

function checkClean(w: WorldScene) {
  refresh(w);
  if (n('shards') < SHARDS.length || n('debris') < DEBRIS.length) return;
  w.removeProp('shards');
  G.setFlag('cleaned');
  w.ui.questDone();
  spawnTrash(w);
}

function spawnTrash(w: WorldScene) {
  const bag = w.addProp('trash', 'pr_trashbag', 100, 176);
  bag.setScale(0);
  w.tweens.add({ targets: bag, scale: 1, duration: 300, ease: 'Back.out' });
  w.addInteract({
    id: 'trash',
    x: 100,
    y: 168,
    label: 'Buộc túi rác',
    use: async () => {
      sfx('trash_bag');
      G.give('trash');
      w.removeProp('trash');
      w.removeInteract('trash');
      w.ui.toast('Nhận được: Túi rác', 'pr_trashbag');
      refresh(w, true);
    },
  });
}

function closable(w: WorldScene, flag: (typeof DOORS)[number], x: number, y: number, label: string, draw: () => void) {
  if (G.flag(flag)) return draw();
  w.addInteract({
    id: flag,
    x,
    y,
    r: 26,
    label,
    use: async () => {
      G.setFlag(flag);
      sfx('door_close');
      w.time.delayedCall(250, () => sfx('lock_click'));
      draw();
      w.removeInteract(flag);
      w.cameras.main.shake(120, 0.002);
      w.ui.toast(`Đã đóng ${doorsClosed()}/3`, 'it_key');
      refresh(w);
    },
  });
}

function dustPuff(w: WorldScene, x: number, y: number) {
  const em = w.add
    .particles(x, y, 'px_dust', {
      speed: { min: 10, max: 30 },
      angle: { min: 180, max: 360 },
      lifespan: 600,
      scale: { start: 2, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: 0xd8c3a0,
      emitting: false,
    })
    .setDepth(5000);
  em.explode(14);
  w.time.delayedCall(800, () => em.destroy());
}

function setupFront(w: WorldScene, ev?: string) {
  const st = G.stage;

  if (st === 'find_number' && !G.flag('dadCame')) {
    const mom = w.addNpc('mom', 'ch_mom', 356, 160, 'down');
    w.addInteract({
      id: 'mom',
      x: 356,
      y: 150,
      r: 30,
      label: 'Nói chuyện với mẹ',
      use: () =>
        w.ui.say(
          G.has('notebook')
            ? L('mom', 'Gọi được cho ba chưa con? Ui da…', 'pain')
            : L('mom', 'Cuốn sổ tay của mẹ ở góc tủ trong phòng mẹ đó con.', 'pain'),
        ),
    });
    if (ev === 'ask_number') {
      void w.cutscene(async () => {
        w.player.setPosition(330, 175).face('right');
        mom.face('left');
        await w.ui.fadeIn(500);
        await w.ui.say([
          'Tôi dìu mẹ lên nhà trên ngồi nghỉ, định gọi ba về chở mẹ đi trạm xá…',
          '…nhưng ba mới đổi số mấy hôm trước, tôi chưa kịp lưu.',
          L('me', 'Mẹ, mẹ có nhớ số của ba không?'),
          L('mom', 'Hình như mẹ cũng chưa lưu số của ổng hay sao á…', 'pain'),
          'Cả nhà chìm vào im lặng.',
          L('mom', 'À! Hình như bữa ba có đưa mẹ tờ giấy ghi số. Mẹ kẹp trong cuốn sổ tay trong phòng mẹ đó. Con vô tìm thử đi.', 'neutral'),
        ]);
        refresh(w, true);
      });
    } else if (G.has('notebook')) void dadArrives(w, mom);
  }

  if (st === 'clean' && G.has('trash')) {
    w.addInteract({
      id: 'trash_out',
      x: 200,
      y: 296,
      r: 34,
      label: 'Để túi rác trước cửa',
      use: async () => {
        sfx('trash_bag');
        G.take('trash');
        G.stage = 'wash';
        w.ui.questDone();
        w.ui.toast('Xe rác sẽ tới thu', 'pr_trashbag');
        await w.ui.say(L('me', 'Xong một việc. Còn chồng chén mẹ chưa rửa nữa…', 'neutral'));
        refresh(w, true);
      },
    });
  }

  if (st === 'doors') {
    w.addProp('bike', 'pr_bicycle', 232, 312);
  }

  if (st === 'return' && ev === 'home') void homecoming(w);
  if (st === 'tidy') setupTidy(w);
  if (st === 'cook') {
    w.addNpc('mom', 'ch_momcast', 356, 160, 'down');
  }
}

async function dadArrives(w: WorldScene, mom: ReturnType<WorldScene['addNpc']>) {
  await w.cutscene(async () => {
    G.setFlag('dadCame');
    await w.wait(400);
    sfx('bike_bell');
    await w.wait(500);
    const dad = w.addNpc('dad', 'ch_dad', 200, 340, 'up', false);
    await dad.path([
      [200, 210],
      [320, 210],
      [330, 178],
    ], 80);
    dad.face('right');
    dad.emote('!');
    await w.ui.say([
      L('dad', 'Bà ơi! Sao ra nông nỗi này?!', 'worried'),
      L('mom', 'Ui da… nhẹ tay thôi ông. Trật cái tay rồi chứ gì nữa.', 'pain'),
      L('dad', 'Con ở nhà dọn dẹp giùm ba mẹ nha. Ba chở mẹ đi trạm xá liền.', 'worried'),
      L('me', 'Dạ, ba mẹ đi đi, ở nhà để con lo.', 'neutral'),
    ]);
    await mom.walkTo(330, 200, 40);
    await Promise.all([
      mom.path([
        [220, 210],
        [205, 345],
      ], 45),
      dad.path([
        [235, 212],
        [215, 345],
      ], 45),
    ]);
    w.removeNpc('mom');
    w.removeNpc('dad');
    await w.wait(300);
    await w.ui.say([
      'Ba chở mẹ đi rồi. Giờ chỉ còn tôi với… đống chén vỡ dưới bếp.',
      L('me', 'Đầu tiên lấy chổi với hốt rác, nhặt mảnh lớn trước rồi quét phần vụn.', 'neutral'),
    ]);
    G.stage = 'clean';
    G.checkpoint({ scene: 'World', data: { map: 'front', spawn: 'fromMom' } });
    refresh(w, true);
  });
}

function setupMomRoom(w: WorldScene) {
  w.addInteract({
    id: 'bed',
    x: 160,
    y: 160,
    r: 24,
    label: 'Giường của mẹ',
    use: () => w.ui.say('Cái mùng vẫn còn treo gọn gàng. Mẹ lúc nào cũng ngăn nắp.'),
  });
  w.addInteract({
    id: 'dresser',
    x: 242,
    y: 104,
    r: 26,
    label: 'Bàn trang điểm',
    use: () => w.ui.say(G.has('notebook') ? 'Không còn gì cần tìm ở đây.' : 'Chỉ có lược, kẹp tóc… không thấy tờ giấy nào.'),
  });
  w.addInteract({
    id: 'sewing',
    x: 318,
    y: 104,
    r: 22,
    label: 'Rổ kim chỉ',
    use: () => w.ui.say('Kim chỉ của mẹ. Không có sổ ở đây.'),
  });
  if (G.stage === 'find_number' && !G.has('notebook')) {
    const glint = w.add.star(420, 96, 4, 1, 3, 0xfff1a8).setDepth(7000);
    w.tweens.add({ targets: glint, scale: 1.6, alpha: 0.2, angle: 90, yoyo: true, repeat: -1, duration: 600 });
    w.addInteract({
      id: 'wardrobe',
      x: 405,
      y: 120,
      r: 32,
      label: 'Lục tủ',
      use: async () => {
        sfx('notebook_flip');
        glint.destroy();
        G.give('notebook');
        w.ui.toast('Nhận được: Sổ tay của mẹ', 'pr_notebook');
        await w.ui.say([
          'Cuốn sổ tay nằm ở góc tủ. Kẹp bên trong là tờ giấy ghi số điện thoại của ba.',
          L('me', 'Mẹ ơi con tìm thấy rồi! Để con gọi ba về. Giờ này chắc ổng đang ở công viên coi mấy ông già đánh cờ.', 'smug'),
        ]);
        sfx('phone_pickup');
        await w.wait(500);
        await w.ui.say([
          L('dad', 'Alo? Ai đó?', 'neutral'),
          L('me', 'Ba ơi, con nè! Mẹ té gãy tay rồi, ba về chở mẹ đi trạm xá liền đi!'),
          L('dad', 'Hả?! Ván cờ này ba đang thắng mà… Thôi thôi, ba về liền!', 'worried'),
        ]);
        refresh(w, true);
      },
    });
  }
  if (G.stage === 'doors') {
    closable(w, 'win_mom', 46, 226, 'Đóng cửa sổ', () => {
      const g = w.add.graphics().setDepth(3);
      g.fillStyle(0x4a2d18).fillRect(18, 92, 22, 118);
      g.fillStyle(0x6b4426);
      for (let y = 95; y < 206; y += 9) g.fillRect(20, y, 18, 6);
    });
  }
}

function setupGarden(w: WorldScene, ev?: string) {
  const st = G.stage;
  if (st === 'eggs') {
    const g1 = w.add.sprite(540, 228, 'ch_goose', 0).setOrigin(0.5, 1).play('goose:walk');
    const g2 = w.add.sprite(610, 300, 'ch_goose', 0).setOrigin(0.5, 1).play('goose:walk').setFlipX(true);
    [g1, g2].forEach((g, i) => {
      g.setDepth(10 + g.y);
      w.tweens.add({ targets: g, x: g.x + (i ? -24 : 24), yoyo: true, repeat: -1, duration: 2200 + i * 400, ease: 'Sine.inOut', onYoyo: () => g.toggleFlipX(), onRepeat: () => g.toggleFlipX() });
    });
    w.addTrigger([66, 205, 656, 200], () => {
      void w.cutscene(async () => {
        w.tweens.killTweensOf([g1, g2]);
        sfx('goose_honk');
        g1.play('goose:bite');
        await w.pan(560, 260, 700);
        sfx('goose_honk', { detune: -300 });
        g2.play('goose:bite');
        await w.wait(500);
        await w.ui.say([
          'Hai con ngỗng già quay đầu lại. Một luồng sát khí bốc lên ngùn ngụt…',
          L('me', 'Tụi bây… định chơi tao hả?', 'smug'),
        ]);
        G.checkpoint({ scene: 'Goose' });
        await w.startScene('Goose');
      });
    });
  }
  if (st === 'store_eggs' && ev === 'goose_done') {
    void w.cutscene(async () => {
      await w.wait(300);
      w.ui.toast(`Nhận được: ${G.d.eggs} quả trứng`, 'it_egg2');
      await w.ui.say(L('me', 'Phù… còn nguyên cái mông. Đem trứng vô bếp cất thôi.', 'smug'));
      refresh(w, true);
    }, false);
  }
}

function setupBa8(w: WorldScene, ev?: string) {
  const ba8 = w.addNpc('ba8', 'ch_ba8', 420, 250, 'down');
  w.addProp('bike', 'pr_bicycle', 90, 300);
  w.setExitVisible('ba8_home', G.has('meat'));
  if (ev === 'arrive') {
    void w.cutscene(async () => {
      await w.player.walkTo(200, 300, 70);
      await w.ui.say(L('me', 'Tới rồi! Chiến mã đời Tống vẫn còn nguyên.', 'smug'));
      refresh(w, true);
    }, false);
  }
  w.addInteract({
    id: 'ba8',
    x: 420,
    y: 248,
    r: 30,
    label: 'Nói chuyện với bà 8',
    use: async () => {
      if (G.has('meat')) return w.ui.say(L('ba8', 'Về cẩn thận nha con, cho bà gửi lời hỏi thăm mẹ.', 'smile'));
      ba8.face('down');
      await w.ui.say([
        L('me', 'Cô ơi, con tới lấy thịt của bà Lan.'),
        L('ba8', 'Con của gái Lan hả? Vô đây lấy thịt nè. Lan có đứa con đẹp trai dữ trời! Nay con học lớp mấy rồi?', 'laugh'),
        L('me', 'Dạ con học 11 rồi cô.'),
        L('ba8', 'Trời, qua năm là đi thành phố rồi. Cha mẹ mày làm mệt luôn.', 'smile'),
        L('me', 'Dạ vâng.'),
        L('ba8', 'Đây, thịt mẹ mày dặn nè: 2 ký ba chỉ, 3 ký sườn. Mà mẹ mày đâu mà để mày đi vậy?', 'neutral'),
        L('me', 'Dạ mẹ con bị té nên ba chở mẹ đi bệnh viện rồi ạ.', 'sad'),
        L('ba8', 'Trời đất! Có nặng không con?', 'worried'),
        L('me', 'Dạ con chưa biết nữa, nhưng chắc không sao đâu cô.'),
        L('ba8', 'Mong là vậy. Ba chỉ 129 ngàn ký lấy con 120, sườn 130. Tổng hết 630 nha con.', 'neutral'),
        L('me', 'Dạ… ghi sổ cho mẹ con đi cô. Đi vội quá mẹ quên đưa tiền cho con rồi.', 'smug'),
        L('ba8', 'Ừ, để cô ghi sổ cho.', 'smile'),
      ]);
      sfx('pickup');
      G.give('meat');
      w.ui.toast('Nhận được: 2kg ba chỉ, 3kg sườn (ghi sổ)', 'pr_meat');
      w.setExitVisible('ba8_home', true);
      G.checkpoint({ scene: 'World', data: { map: 'ba8', spawn: 'shop' } });
      refresh(w, true);
    },
  });
}

function setupPark(w: WorldScene, ev?: string) {
  const crowd = [
    w.addNpc('qc1', 'ch_crowd1', 150, 350, 'right'),
    w.addNpc('qc2', 'ch_crowd2', 180, 330, 'down'),
    w.addNpc('c3', 'ch_crowd1', 352, 318, 'up'),
    w.addNpc('c4', 'ch_crowd2', 495, 318, 'up'),
    w.addNpc('c5', 'ch_crowd2', 340, 262, 'right'),
  ];
  crowd.forEach((c, i) => w.time.addEvent({ delay: 1400 + i * 300, loop: true, callback: () => Math.random() < 0.3 && c.hop(3) }));
  const tn = w.addNpc('tn', 'ch_thanhnien', 420, 228, 'down');
  w.addProp('bike', 'pr_bicycle', 40, 418);

  if (ev === 'oq_done') {
    const nam = w.addNpc('nam', 'ch_nam', 456, 322, 'up');
    w.player.setPosition(420, 322).face('up');
    void afterOAnQuan(w, nam, tn, Number(w.data0.payload ?? G.d.money));
    return;
  }
  if (G.stage !== 'park') return;

  void w.cutscene(async () => {
    await w.player.walkTo(130, 390, 70);
    w.player.face('right');
    await w.ui.say([
      'Mọi thứ vẫn rất bình thường… cho tới khi tôi đi ngang công viên làng. Ở đó đang tụ tập rất đông người.',
      L('me', 'Có vụ gì hot hay sao mà nhiều người vậy?'),
      L('qc1', 'À, huyện mình đang tổ chức lễ hội quảng bá truyền thống đó con.', 'woman_smile'),
      L('qc2', 'Có các trò chơi dân gian, rồi các quầy ẩm thực mở theo ngày nữa.', 'oldman'),
      L('me', 'Vậy lễ hội tổ chức tới khi nào mới kết thúc ạ?'),
      L('qc2', 'Chắc cũng khá lâu. Mới tổ chức được hai ngày thôi.', 'oldman_smile'),
    ]);
    const nam = w.addNpc('nam', 'ch_nam', 300, 470, 'up', false);
    await nam.path([[260, 400], [165, 395]], 80);
    nam.face('left');
    nam.emote('♪');
    await w.ui.say([
      L('nam', 'Ê cu, cũng đi tham quan à cu?', 'happy'),
      L('me', 'Không, tao chỉ đi ngang thấy đông nên tấp vô xem thử. Mà mày đi một mình à, không đi chung với em ghệ sao?', 'smug'),
      L('nam', 'Mày cứ đùa, tao ế chỏng vó chứ ở đó mà ghệ với chả ghẹ. Đi chung với tao không, tao định ra quầy ô ăn quan kia chơi.', 'annoyed'),
      L('me', 'Chắc tao chơi được một ván thôi, tao còn phải về nhà nữa.'),
      L('nam', 'Ừ vậy cũng được. Đi thôi!', 'happy'),
    ]);
    await Promise.all([
      w.player.path([[260, 395], [420, 330], [420, 322]], 75),
      nam.path([[270, 410], [456, 332], [456, 322]], 75),
    ]);
    w.player.face('up');
    nam.face('up');
    await w.pan(420, 270, 500);
    tn.hop(5);
    await w.ui.say([
      L('tn', 'HAHA! Trò này tôi là bố các người. Tuổi gì mà đòi so với tôi!', 'laugh'),
      L('me', '……'),
      L('nam', '……', 'annoyed'),
      L('nam', 'Ê, hay tao với mày vô gạ kèo solo đi, tao thấy ngứa mắt thằng đó quá.', 'annoyed'),
      L('me', 'Thằng nào thua thì trả tiền net đứa còn lại.', 'smug'),
      L('nam', 'Chốt! Thua gọi đứa kia là bố.', 'happy'),
      L('me', 'Okê con zai ngoan, chuẩn bị tiền net khao bố đi con.', 'smug'),
      L('nam', 'Chưa biết ai con ai đâu.', 'annoyed'),
      L('nam', 'Ê nhóc, solo không? Giao kèo gì nói nhanh, bố mày đang vội.', 'neutral'),
      L('tn', 'Vậy thì 1 kèo 20k đi. Quân dân 1 điểm, quân quan 5 điểm. Hết quân thì tính điểm, ai nhiều hơn thắng.', 'smirk'),
      L('nam', 'Ok, vậy chơi vài ván đi!', 'happy'),
    ]);
    await w.ui.fadeOut(500);
    await w.ui.caption('Vài ván sau…', '', 900);
    await w.ui.fadeIn(500);
    await w.ui.say([
      'Kết quả đúng như dự đoán: Nam thua sạch tiền tiêu vặt. Nhìn nó bây giờ như cái xác.',
      L('nam', 'Mày ơi… mày còn tiền không, cho tao mượn tao gỡ với.', 'broke'),
      L('me', 'Mày khỏi đi. Gà mà hay gáy quá. Để bố mày gỡ cho.', 'smug'),
      L('tn', 'Vậy là ông anh đây sẽ là đối thủ tiếp theo của tôi à? Định gỡ vốn cho ông anh kia hay là lì xì tôi đây?', 'smirk'),
      L('me', 'Anh đây không có gà như thằng đó đâu. Vậy ta nâng tiền cược lên đi!', 'smug'),
    ]);
    G.checkpoint({ scene: 'OAnQuan' });
    await w.startScene('OAnQuan');
  });
}

async function afterOAnQuan(w: WorldScene, nam: ReturnType<WorldScene['addNpc']>, tn: ReturnType<WorldScene['addNpc']>, money: number) {
  await w.cutscene(async () => {
    nam.face('left');
    await w.wait(400);
    if (money > 50_000) {
      tn.face('down');
      await w.ui.say([
        L('tn', 'Không… không thể nào!', 'shock'),
        L('me', 'Về thôi con zai, bố gỡ được tiền cho con rồi nè.', 'smug'),
        'Nam đang ngẩn ngơ bên cạnh, nghe được câu này bỗng nhiên có sức sống.',
        L('nam', 'Hả? Mày gỡ được thật hả?! Đội ơn mày, không có mày chắc mông tao nở hoa quá!', 'happy'),
        L('me', 'Gà thì đừng chơi mấy trò này. Chừa lần này thôi đó.', 'smug'),
      ]);
      const bac = w.addNpc('bac', 'ch_crowd2', 520, 300, 'left', false);
      await bac.walkTo(480, 320, 50);
      await w.ui.say([
        L('bac', 'Cháu đánh hay đấy! Rảnh rảnh qua nhà bác đánh vài ván cho vui nhé.', 'oldman_smile'),
        L('me', 'Dạ vâng, con sẽ qua. Cũng trễ rồi, con chạy về trước nha bác. Tao đi trước nha Nam, nào rảnh tao qua chơi với mày.'),
        L('nam', 'Ok, nhớ qua chơi đó!', 'happy'),
      ]);
    } else {
      tn.face('down');
      await w.ui.say([
        L('tn', 'Ô kìa ông anh, sao bảo gỡ tiền cho bạn ông anh mà? Đã không gỡ được còn tặng tôi thêm. Cảm ơn ông anh nha!', 'laugh'),
        L('nam', 'Sao mày bảo mày gỡ được mà?', 'broke'),
        L('me', 'Chịu rồi mày ơi, thằng này nó cao thủ trò này thật, tao gỡ không nổi.', 'sad'),
        L('nam', 'Thế giờ sao, có la cà ở đâu không hay đi về?', 'broke'),
        L('me', 'Thôi đi về, giờ tiền không có ăn luôn chứ ở đó mà la cà. Mày đi xe hay đi bộ để tao còn chở về?', 'sad'),
        L('nam', 'Vậy chở tao về đi. Nay tao đi bộ.', 'broke'),
        'Hai thằng đèo nhau trên con chiến mã đã tàn, nay còn tàn hơn.',
      ]);
    }
    G.stage = 'return';
    await w.ui.fadeOut(500);
    await w.ui.caption('Trên đường về nhà…', '', 900);
    w.scene.restart({ map: 'front', spawn: 'fromStreet', event: 'home' });
  });
}

async function homecoming(w: WorldScene) {
  if (doorsClosed() < 3) {
    await w.cutscene(async () => {
      music(null);
      await w.wait(400);
      w.player.emote('?');
      await w.ui.say([
        L('me', 'Ủa… sao nhà trống trơn vậy?', 'shock'),
        'Bàn ghế, tủ kính, nồi niêu… tất cả đều biến mất. Cửa nẻo vẫn mở toang như lúc tôi đi.',
      ]);
      await endWith(w, 'robbed');
    });
    return;
  }
  await w.cutscene(async () => {
    G.checkpoint({ scene: 'World', data: { map: 'front', spawn: 'fromStreet', event: 'home' } });
    await w.wait(300);
    sfx('bike_bell');
    await w.player.walkTo(200, 230, 70);
    w.player.face('down');
    const mom = w.addNpc('mom', 'ch_momcast', 185, 345, 'up', false);
    const dad = w.addNpc('dad', 'ch_dad', 215, 345, 'up', false);
    await Promise.all([mom.walkTo(180, 270, 40), dad.walkTo(222, 270, 45)]);
    await w.ui.say([
      'Cùng lúc tôi lấy thịt về thì ba cũng chở mẹ về. Mẹ bị trật khớp, phải bó bột, không được vận động một thời gian.',
      L('mom', 'Quán vẫn sẽ mở cửa. Mẹ bị thế này rồi, thôi thì sẵn con đang nghỉ hè, làm giúp mẹ.', 'neutral'),
      L('mom', 'Vừa phụ mẹ vừa học nấu ăn, sau này lên đại học còn biết đường mà nấu.', 'smile'),
      L('me', 'Nhưng con hồi giờ có biết nấu gì đâu! Đến nồi cơm còn quên bật nút nữa là…', 'shock'),
      L('mom', 'Không nói nhiều nữa, quyết định vậy đi. Xíu mẹ chỉ con chiên cơm trước để mai bán. Sẵn dọn dẹp bàn ghế lại luôn.', 'neutral'),
      L('me', 'Hông chịu đâu! Con mới tận hưởng được mấy ngày hè mà bị mẹ bắt làm rồi!', 'sad'),
    ]);
    sfx('slipper_whoosh');
    await w.ui.showCG('cg_broom', 200);
    w.cameras.main.shake(300, 0.01);
    sfx('thwack');
    await w.ui.say([
      'Vừa dứt lời thì cây chổi bay vèo ngang mặt. Nhìn lại, mẹ đang hầm hầm sát khí.',
      L('mom', 'MỘT LÀ LÀM, TAO CÒN CHO TIỀN TIÊU VẶT. HAI LÀ MÀY NO ĐÒN VỚI TAO!', 'angry', true),
    ]);
    await w.ui.hideCG();
    const pick = await w.ui.choose('Chọn đi con…', ['“Một!” — Mẫu hậu nói gì kì vậy, con lúc nào chả nghe lời mẫu hậu ạ', '“Hai…?”']);
    if (pick === 1) {
      await w.ui.say(L('mom', 'Được. Mày chọn đó nha.', 'angry'));
      sfx('slipper_whoosh');
      await endWith(w, 'slipper');
      return;
    }
    await w.ui.say([
      L('me', 'Mẫu hậu nói gì kì vậy, con lúc nào chả nghe lời của mẫu hậu đâu, hihi.', 'smug'),
      '(Mình mà không làm khéo mai khách được ăn giỗ mình thay cơm luôn.)',
      L('mom', 'Vậy thì xếp ghế lại cho mẹ. Xong vô bếp.', 'smile'),
    ]);
    await Promise.all([
      mom.path([[300, 210], [356, 160]], 40),
      dad.path([[200, 120]], 50),
    ]);
    mom.face('down');
    w.removeNpc('dad');
    G.stage = 'tidy';
    G.checkpoint({ scene: 'World', data: { map: 'front', spawn: 'center' } });
    setupTidy(w);
    refresh(w, true);
  });
}

function setupTidy(w: WorldScene) {
  if (!w.npcs.has('mom')) w.addNpc('mom', 'ch_momcast', 356, 160, 'down');
  STOOLS.forEach(([x, y], i) => {
    const id = `stool${i}`;
    if (G.flag(id)) return;
    w.addProp(id, 'pr_stools_stack', x, y, { solid: true });
    w.addInteract({
      id,
      x,
      y: y - 8,
      r: 26,
      hold: 700,
      label: 'Giữ E để xếp ghế',
      use: async () => {
        G.setFlag(id);
        G.setFlag('stools', n('stools') + 1);
        sfx('pan_place', { rate: 0.8 });
        w.removeProp(id);
        w.removeInteract(id);
        refresh(w);
        if (n('stools') >= STOOLS.length) {
          w.ui.questDone();
          G.stage = 'cook';
          G.checkpoint({ scene: 'World', data: { map: 'front', spawn: 'center' } });
          await w.ui.say(L('mom', 'Được rồi đó. Giờ vô bếp, mẹ chỉ chiên cơm.', 'smile'));
          refresh(w, true);
        }
      },
    });
  });
}

async function tasting(w: WorldScene, score: number) {
  await w.cutscene(async () => {
    const mom = w.npcs.get('mom')!;
    const dad = w.npcs.get('dad')!;
    w.player.setPosition(150, 238).face('up');
    await dad.walkTo(200, 230, 50);
    dad.face('left');
    mom.face('down');
    await w.ui.say([
      L('me', 'Ba mẹ, con làm xong rồi! Hai người nếm thử xem thế nào.', 'smug'),
      L('dad', 'Để xem con zai iu của ta nấu như thế nào nào.', 'laugh'),
      'Ba mẹ bắt đầu nếm thử món ăn…',
    ]);
    music(null);
    await w.wait(900);
    sfx('heartbeat');
    await w.wait(900);
    if (score >= 60) {
      await w.ui.say([
        L('dad', '……', 'amazed'),
        '(Ba nhìn mẹ.)',
        L('mom', 'Quyết định vậy đi. Ngày mai con bắt đầu mở quán. Mẹ sẽ giám sát, đừng hòng qua mặt mẹ.', 'smile'),
        L('dad', 'Không ngờ con nấu ăn đỉnh vậy! Con có năng khiếu đấy, khéo sau này về kế thừa quán của mẹ luôn.', 'amazed'),
        L('me', 'Hehe… vậy tiền tiêu vặt của con…', 'smug'),
      ]);
      G.stage = 'done';
      await endWith(w, 'good');
    } else {
      await w.ui.say([
        L('dad', 'Ừm… nói sao nhỉ. Tốt nhất mình nên đóng cửa quán mẹ nó nhỉ, chứ để nó nấu khéo quán mình mang tiếng mất.', 'worried'),
        L('mom', 'Ông nói đúng. Khéo quán ta mang tiếng mất.', 'pain'),
        L('me', 'Ba mẹ nói quá! Làm gì tệ đến mức đó…', 'sad'),
        'Nói rồi tôi ăn thử một muỗng.',
      ]);
      w.cameras.main.shake(600, 0.01);
      w.ui.flash(0x9fd36a, 500);
      await w.ui.say(['Mặt mày choáng váng. Trời đất quay cuồng…', 'Tôi tỉnh dậy trong bệnh viện.']);
      G.stage = 'done';
      await endWith(w, 'hospital');
    }
  });
}

async function endWith(w: WorldScene, id: EndingId) {
  await w.ui.fadeOut(700);
  w.ui.hudVisible(false);
  w.ui.quest(null);
  w.scene.start('Ending', { id });
}

// ───────────────────────────── exits ─────────────────────────────
export async function onExit(w: WorldScene, e: ExitDef): Promise<boolean> {
  const st = G.stage;
  const say = (t: string) => w.ui.say(L('me', t)).then(() => false);
  switch (e.id) {
    case 'bedroom_out':
      return true;
    case 'front_kitchen':
    case 'front_mom':
    case 'mom_front':
    case 'kitchen_front':
      if (st === 'find_number' && G.has('notebook') && e.id === 'front_kitchen') return say('Ra gian quán chờ ba đã.');
      return true;
    case 'kitchen_garden':
      return true;
    case 'garden_kitchen':
      return true;
    case 'front_street': {
      if (st !== 'doors') return say(st === 'clean' && G.has('trash') ? 'Để túi rác ngay trước cửa là được.' : 'Giờ chưa phải lúc ra đường.');
      const c = doorsClosed();
      const pick = await w.ui.choose(
        c < 3 ? `Dắt xe đi lấy thịt nhà bà 8? (mới đóng ${c}/3 cửa)` : 'Dắt xe đi lấy thịt nhà bà 8?',
        ['Đi thôi!', 'Khoan đã'],
      );
      if (pick !== 0) return false;
      G.checkpoint({ scene: 'Ride' });
      await w.startScene('Ride');
      return false;
    }
    case 'ba8_home':
      if (!G.has('meat')) return say('Chưa lấy thịt mà về là mẹ xử đẹp.');
      G.stage = 'park';
      return true;
    case 'park_home':
      return st === 'return';
  }
  return true;
}

// ───────────────────────────── minigame routing ─────────────────────────────
export function afterMinigame(s: Phaser.Scene, id: MinigameId, r: MinigameResults[MinigameId]) {
  const go = (key: string, data: Record<string, unknown>) => {
    const u = ui(s);
    void u.fadeOut(400).then(() => s.scene.start(key, data));
  };
  switch (id) {
    case 'wash':
      G.stage = 'wash';
      G.setFlag('washed');
      return go('World', { map: 'kitchen', spawn: 'center', event: 'wash_done' });
    case 'goose': {
      const g = r as MinigameResults['goose'];
      if (!g.won) return go('Ending', { id: 'goose' });
      G.d.eggs = g.eggs;
      G.stage = 'store_eggs';
      G.checkpoint({ scene: 'World', data: { map: 'garden', spawn: 'fromKitchen' } });
      return go('World', { map: 'garden', spawn: 'fromKitchen', event: 'goose_done' });
    }
    case 'ride': {
      const g = r as MinigameResults['ride'];
      if (!g.won) return go('Ending', { id: 'crash' });
      G.stage = 'ba8';
      G.checkpoint({ scene: 'World', data: { map: 'ba8', spawn: 'fromRide', event: 'arrive' } });
      return go('World', { map: 'ba8', spawn: 'fromRide', event: 'arrive' });
    }
    case 'oanquan': {
      const g = r as MinigameResults['oanquan'];
      return go('World', { map: 'park', spawn: 'board', event: 'oq_done', payload: g.money });
    }
    case 'cooking': {
      const g = r as MinigameResults['cooking'];
      return go('World', { map: 'kitchen', spawn: 'fromFront', event: 'tasting', payload: g.score });
    }
  }
}
