import type { EndingId } from '../state/GameState';
import type { MusicKey } from './audioManifest';

export interface EndingDef {
  title: string;
  text: string;
  cg: string;
  good: boolean;
  music: MusicKey;
}

export const ENDINGS: Record<EndingId, EndingDef> = {
  good: {
    title: 'Truyền nhân quán cơm',
    text: 'Đĩa cơm chiên vàng ruộm khiến ba mẹ cũng phải gật gù. Từ mai, quán cơm bà Lan có đầu bếp mới.',
    cg: 'cg_good_end',
    good: true,
    music: 'ending_good',
  },
  hospital: {
    title: 'Đầu bếp… của bệnh viện',
    text: 'Con nghĩ nó tệ rồi, không ngờ nó còn tệ hơn con tưởng. Quán tạm đóng cửa cho tới khi mẹ tháo bột.',
    cg: 'cg_hospital',
    good: false,
    music: 'ending_bad',
  },
  goose: {
    title: 'Bạn đã bị đánh bại bởi hai con ngỗng',
    text: 'Hai con ngỗng già vẫn là chúa tể khu vườn. Mông bạn thì không còn nguyên vẹn.',
    cg: 'cg_goose_lose',
    good: false,
    music: 'ending_bad',
  },
  crash: {
    title: 'Té chỏng gọng',
    text: 'Chạy xe quá “gà”. Chiến mã đời Tống và bạn cùng nằm dưới ổ gà.',
    cg: 'cg_bike_crash',
    good: false,
    music: 'ending_bad',
  },
  robbed: {
    title: 'Vườn không nhà trống',
    text: 'Theo đúng nghĩa đen. Mẹ đã dặn đóng hết cửa rồi mà…',
    cg: 'cg_robbed',
    good: false,
    music: 'ending_bad',
  },
  slipper: {
    title: 'No đòn',
    text: 'Bạn đã chọn “hai”. Chiếc dép tổ ong bay với vận tốc ánh sáng.',
    cg: 'cg_slipper',
    good: false,
    music: 'ending_bad',
  },
};

export const ENDING_ORDER: EndingId[] = ['good', 'hospital', 'goose', 'crash', 'robbed', 'slipper'];
