/* ==========================================================================
 * 中国辣力地图 —— 数据层 (js/data.js)
 * --------------------------------------------------------------------------
 * 说明：
 *  1. 全部数据挂在全局变量 window.SPICY_DATA 上，不使用 ES Module 的 export/import。
 *  2. name 字段必须与 GeoJSON 的 properties.name 完全一致（例如“四川省”“重庆市”
 *     “广西壮族自治区”），页面显示简称时使用 shortName，绝不修改 name。
 *  3. 辣度体系统一为 0-10，可保留一位小数。
 *     - spicyLevel：该省“综合辣度”，用于地图红色深度映射（0-10 连续映射）。
 *     - dishes[i].spicy：单道菜辣度（0-10）。
 *  4. 校准原则：不是所有菜都拉到 9-10。同一省内菜品辣度必须有梯度，
 *     不辣 / 微辣省份要出现 0-2 分的菜品，重辣省份也要有清淡菜作为对照。
 * ========================================================================== */

window.SPICY_DATA = [
  /* ----------------------------- 华 北 ----------------------------- */
  {
    name: '北京市',
    shortName: '北京',
    spicyLevel: 3.0,
    dishes: [
      { name: '麻豆腐', spicy: 3.0, desc: '羊油炒制，配辣椒油才够味，辣度很轻' },
      { name: '卤煮火烧', spicy: 2.5, desc: '蒜汁加少许辣椒油，重口但不辣' },
      { name: '爆肚', spicy: 2.0, desc: '芝麻酱蘸料为主，辣椒油只是点缀' },
      { name: '炸酱面', spicy: 1.0, desc: '黄酱咸香，几乎不辣' },
      { name: '北京烤鸭', spicy: 0.5, desc: '甜面酱配荷叶饼，完全不辣' }
    ]
  },
  {
    name: '天津市',
    shortName: '天津',
    spicyLevel: 3.0,
    dishes: [
      { name: '独面筋', spicy: 2.5, desc: '浓油赤酱略带胡椒辣，微辣收口' },
      { name: '锅巴菜', spicy: 1.5, desc: '卤汁打底，辣油按个人口味添加' },
      { name: '煎饼馃子', spicy: 1.0, desc: '面酱腐乳为主，辣酱可选' },
      { name: '罾蹦鲤鱼', spicy: 0.5, desc: '酸甜口，不辣' },
      { name: '十八街麻花', spicy: 0.0, desc: '甜口点心，完全不辣' }
    ]
  },
  {
    name: '河北省',
    shortName: '河北',
    spicyLevel: 3.0,
    dishes: [
      { name: '河北牛肉板面', spicy: 6.0, desc: '安徽板面在河北发扬光大，红油羊油厚重' },
      { name: '张家口莜面', spicy: 2.0, desc: '蘸料带一点辣，主体是莜面香' },
      { name: '驴肉火烧', spicy: 1.5, desc: '卤香浓郁，青椒版本带轻微辣感' },
      { name: '金毛狮子鱼', spicy: 0.5, desc: '糖醋口，不辣' },
      { name: '承德御土荷叶鸡', spicy: 0.5, desc: '荷叶清香，不辣' }
    ]
  },
  {
    name: '山西省',
    shortName: '山西',
    spicyLevel: 3.5,
    dishes: [
      { name: '晋南油泼面', spicy: 5.0, desc: '晋南人吃辣，热油泼辣子香而不燥' },
      { name: '刀削面', spicy: 2.5, desc: '面香为主，辣子根据个人口味添加' },
      { name: '猫耳朵', spicy: 2.0, desc: '浇头微辣，主体是面食香' },
      { name: '过油肉', spicy: 1.0, desc: '山西名菜，咸鲜带醋香，不辣' },
      { name: '平遥牛肉', spicy: 0.5, desc: '咸香卤味，不辣' },
      { name: '太原头脑', spicy: 0.0, desc: '药膳糊糊，配黄酒，完全不辣' }
    ]
  },
  {
    name: '内蒙古自治区',
    shortName: '内蒙古',
    spicyLevel: 4.0,
    dishes: [
      { name: '羊杂碎', spicy: 4.0, desc: '红油汤底，辣度中等偏轻，暖身为主' },
      { name: '蒙古馅饼', spicy: 2.0, desc: '皮薄馅大，蘸料带轻微辣' },
      { name: '烤全羊', spicy: 1.5, desc: '孜然辣椒面少量撒面，以肉香为主' },
      { name: '卓资山熏鸡', spicy: 1.0, desc: '熏香浓郁，不辣' },
      { name: '手把肉', spicy: 0.5, desc: '原汁原味，只蘸盐水，不辣' },
      { name: '蒙古奶茶', spicy: 0.0, desc: '咸香奶香，完全不辣' }
    ]
  },

  /* ----------------------------- 东 北 ----------------------------- */
  {
    name: '辽宁省',
    shortName: '辽宁',
    spicyLevel: 3.5,
    dishes: [
      { name: '抚顺麻辣拌', spicy: 7.0, desc: '辽宁最能吃辣的一口，甜辣重口，土豆粉吸满酱汁' },
      { name: '沈阳烤鸡架', spicy: 4.5, desc: '辣炒鸡架，香辣入味，啤酒绝配' },
      { name: '老边饺子', spicy: 1.0, desc: '煸馅饺子，不辣' },
      { name: '小鸡炖蘑菇', spicy: 0.5, desc: '咸鲜炖菜，不辣' },
      { name: '锅包肉', spicy: 0.0, desc: '酸甜口，完全不辣' }
    ]
  },
  {
    name: '吉林省',
    shortName: '吉林',
    spicyLevel: 3.5,
    dishes: [
      { name: '延边辣白菜', spicy: 5.0, desc: '朝鲜族辣白菜，辣椒粉发酵，辣度中等' },
      { name: '延边烤串', spicy: 4.0, desc: '蘸干料，辣椒面为主，微辣偏中' },
      { name: '长春炒肉拉皮', spicy: 2.5, desc: '芥末与辣油双味，轻辣' },
      { name: '延吉冷面', spicy: 2.0, desc: '酸甜冰爽，辣度只是提味' },
      { name: '米肠', spicy: 2.0, desc: '糯米肠蘸辣料，轻辣' },
      { name: '白肉血肠', spicy: 0.5, desc: '酸菜白肉，不辣' }
    ]
  },
  {
    name: '黑龙江省',
    shortName: '黑龙江',
    spicyLevel: 3.0,
    dishes: [
      { name: '齐齐哈尔烤肉', spicy: 4.0, desc: '拌料里带辣椒面，蘸料微辣' },
      { name: '哈尔滨烤冷面', spicy: 3.5, desc: '酸甜微辣，洋葱与辣酱提味' },
      { name: '红肠', spicy: 1.5, desc: '蒜香为主，带一点黑胡椒辣' },
      { name: '得莫利炖鱼', spicy: 1.0, desc: '酱炖江鱼，不辣' },
      { name: '杀猪菜', spicy: 0.5, desc: '酸菜血肠白肉，不辣' },
      { name: '锅包肉', spicy: 0.0, desc: '酸甜口，完全不辣' }
    ]
  },

  /* ----------------------------- 华 东 ----------------------------- */
  {
    name: '上海市',
    shortName: '上海',
    spicyLevel: 2.5,
    dishes: [
      { name: '八宝辣酱', spicy: 4.5, desc: '本帮辣酱，甜中带辣，上海辣度担当' },
      { name: '白斩鸡', spicy: 1.5, desc: '蘸料可选辣酱油，轻辣' },
      { name: '生煎', spicy: 0.5, desc: '底脆汁多，不辣' },
      { name: '红烧肉', spicy: 0.0, desc: '浓油赤酱，完全不辣' },
      { name: '小笼包', spicy: 0.0, desc: '清鲜汤包，完全不辣' }
    ]
  },
  {
    name: '江苏省',
    shortName: '江苏',
    spicyLevel: 2.0,
    dishes: [
      { name: '徐州地锅鸡', spicy: 4.5, desc: '苏北重辣代表，辣椒炒鸡贴喝饼' },
      { name: '阳春面', spicy: 1.0, desc: '清汤光面，不辣' },
      { name: '盐水鸭', spicy: 0.5, desc: '咸鲜回甘，不辣' },
      { name: '松鼠鳜鱼', spicy: 0.0, desc: '酸甜口，完全不辣' },
      { name: '蟹粉狮子头', spicy: 0.0, desc: '清炖本味，完全不辣' }
    ]
  },
  {
    name: '浙江省',
    shortName: '浙江',
    spicyLevel: 2.0,
    dishes: [
      { name: '衢州三头一掌', spicy: 6.5, desc: '浙江最能吃辣的地方，兔头鸭头香辣入骨' },
      { name: '片儿川', spicy: 1.0, desc: '雪菜笋片面，不辣' },
      { name: '西湖醋鱼', spicy: 0.0, desc: '酸甜口，完全不辣' },
      { name: '东坡肉', spicy: 0.0, desc: '酥糯酱香，完全不辣' },
      { name: '龙井虾仁', spicy: 0.0, desc: '清鲜淡雅，完全不辣' }
    ]
  },
  {
    name: '安徽省',
    shortName: '安徽',
    spicyLevel: 3.5,
    dishes: [
      { name: '太和板面', spicy: 6.0, desc: '安徽板面原产地，羊油红油辣得直白' },
      { name: '淮南牛肉汤', spicy: 4.0, desc: '辣油飘香，辣度中等偏轻' },
      { name: '毛豆腐', spicy: 1.5, desc: '煎制后蘸辣酱，轻辣' },
      { name: '臭鳜鱼', spicy: 1.0, desc: '闻臭吃香，几乎不辣' },
      { name: '符离集烧鸡', spicy: 0.5, desc: '卤香脱骨，不辣' }
    ]
  },
  {
    name: '福建省',
    shortName: '福建',
    spicyLevel: 3.0,
    dishes: [
      { name: '武夷山熏鹅', spicy: 5.0, desc: '闽北重辣，熏香配辣椒，越嚼越辣' },
      { name: '沙茶面', spicy: 3.5, desc: '沙茶酱微辣带甜，辣度温和' },
      { name: '姜母鸭', spicy: 2.5, desc: '老姜温补，姜辣非辣椒辣' },
      { name: '沙县拌面', spicy: 1.5, desc: '花生酱为主，几乎不辣' },
      { name: '荔枝肉', spicy: 0.5, desc: '酸甜口，不辣' },
      { name: '佛跳墙', spicy: 0.0, desc: '高汤慢炖，完全不辣' }
    ]
  },
  {
    name: '江西省',
    shortName: '江西',
    spicyLevel: 8.2,
    dishes: [
      { name: '莲花血鸭', spicy: 8.0, desc: '萍乡名菜，鸭血裹身，辣得直接不绕弯' },
      { name: '辣椒炒肉', spicy: 7.5, desc: '江西人的下饭神器，纯辣不麻，镬气十足' },
      { name: '南昌拌粉', spicy: 5.0, desc: '米粉拌辣油萝卜干，早餐辣度温和' },
      { name: '藜蒿炒腊肉', spicy: 3.5, desc: '藜蒿清香配腊肉，微辣点缀' },
      { name: '瓦罐汤', spicy: 2.0, desc: '小火煨汤，清鲜几乎不辣' }
    ]
  },
  {
    name: '山东省',
    shortName: '山东',
    spicyLevel: 3.0,
    dishes: [
      { name: '枣庄辣子鸡', spicy: 6.5, desc: '鲁南重辣，本地薄皮辣椒炒鸡，辣得实在' },
      { name: '辣炒蛤蜊', spicy: 4.5, desc: '青岛夜宵标配，干辣椒爆香，微辣鲜香' },
      { name: '煎饼卷大葱', spicy: 2.0, desc: '大葱的辛辣，不是辣椒的辣' },
      { name: '把子肉', spicy: 1.0, desc: '酱香卤肉，不辣' },
      { name: '九转大肠', spicy: 0.5, desc: '酸甜苦辣咸俱全，但辣度极低' },
      { name: '葱烧海参', spicy: 0.0, desc: '葱香浓郁，完全不辣' }
    ]
  },

  /* ----------------------------- 华 中 ----------------------------- */
  {
    name: '河南省',
    shortName: '河南',
    spicyLevel: 4.0,
    dishes: [
      { name: '胡辣汤', spicy: 5.5, desc: '胡椒与辣椒双重辛辣，浓稠暖胃' },
      { name: '洛阳水席', spicy: 3.0, desc: '酸辣口味为主，辣度温和' },
      { name: '烩面', spicy: 2.0, desc: '羊汤打底，辣子按个人口味添加' },
      { name: '道口烧鸡', spicy: 0.5, desc: '卤香八味，不辣' },
      { name: '开封灌汤包', spicy: 0.0, desc: '清鲜汤汁，完全不辣' }
    ]
  },
  {
    name: '湖北省',
    shortName: '湖北',
    spicyLevel: 6.5,
    dishes: [
      { name: '油焖大虾', spicy: 6.0, desc: '潜江名菜，香辣入味，一盆能吃到冒汗' },
      { name: '周黑鸭', spicy: 5.5, desc: '甜辣卤味，越啃越辣，后劲足' },
      { name: '恩施炕土豆', spicy: 5.0, desc: '土家风味，辣椒面裹满，中辣' },
      { name: '热干面', spicy: 2.5, desc: '芝麻酱为主，辣度靠自加红油' },
      { name: '排骨藕汤', spicy: 0.5, desc: '湖北家常汤，完全不辣' }
    ]
  },
  {
    name: '湖南省',
    shortName: '湖南',
    spicyLevel: 8.8,
    dishes: [
      { name: '口味虾', spicy: 8.0, desc: '长沙夜宵之王，香辣入骨，越吃越上头' },
      { name: '剁椒鱼头', spicy: 7.5, desc: '剁椒铺满鱼头，鲜辣直冲脑门' },
      { name: '小炒肉', spicy: 7.0, desc: '湖南家常代表，螺丝椒炒肉，镬气逼人' },
      { name: '擂辣椒皮蛋', spicy: 6.5, desc: '青椒擂碎拌皮蛋，鲜辣清香' },
      { name: '臭豆腐', spicy: 5.5, desc: '外焦里嫩，辣汁是灵魂，中辣' },
      { name: '毛氏红烧肉', spicy: 1.5, desc: '甜咸口不辣，湖南菜里的清流' }
    ]
  },

  /* ----------------------------- 华 南 ----------------------------- */
  {
    name: '广东省',
    shortName: '广东',
    spicyLevel: 2.5,
    dishes: [
      { name: '豉椒炒花甲', spicy: 4.0, desc: '豆豉辣椒爆炒，广东少见的微辣担当' },
      { name: '潮汕牛肉火锅', spicy: 2.0, desc: '沙茶酱微辣，锅底本身清汤不辣' },
      { name: '肠粉', spicy: 1.0, desc: '清淡滑嫩，辣酱可选' },
      { name: '煲仔饭', spicy: 1.0, desc: '豉油调味，不辣' },
      { name: '白切鸡', spicy: 0.5, desc: '姜葱蘸料，不辣' },
      { name: '烧鹅', spicy: 0.0, desc: '皮脆肉嫩，完全不辣' }
    ]
  },
  {
    name: '广西壮族自治区',
    shortName: '广西',
    spicyLevel: 6.0,
    dishes: [
      { name: '螺蛳粉', spicy: 6.5, desc: '酸笋加辣油，酸辣冲鼻，中辣偏重' },
      { name: '柠檬鸭', spicy: 5.5, desc: '武鸣名菜，酸辣开胃，辣度中等' },
      { name: '老友粉', spicy: 5.0, desc: '南宁味道，酸辣醒神，中辣' },
      { name: '酸嘢', spicy: 4.5, desc: '酸辣腌果，解腻小食，轻辣偏中' },
      { name: '桂林米粉', spicy: 3.0, desc: '卤水为主，辣椒自助添加' }
    ]
  },
  {
    name: '海南省',
    shortName: '海南',
    spicyLevel: 5.0,
    dishes: [
      { name: '黄灯笼辣椒酱', spicy: 8.0, desc: '海南黄灯笼椒制品，辣度惊人，一小勺就够' },
      { name: '糟粕醋火锅', spicy: 5.5, desc: '酸辣糟粕醋，开胃解腻，中辣' },
      { name: '陵水酸粉', spicy: 4.5, desc: '酸辣浓稠，轻辣偏中' },
      { name: '海南粉', spicy: 3.5, desc: '卤汁微辣，轻辣' },
      { name: '文昌鸡', spicy: 2.0, desc: '白切蘸料，辣度可选，微辣' }
    ]
  },
  {
    name: '香港特别行政区',
    shortName: '香港',
    spicyLevel: 2.5,
    dishes: [
      { name: '避风塘炒蟹', spicy: 5.0, desc: '蒜蓉辣椒爆香，港式香辣代表，中辣' },
      { name: '咖喱鱼蛋', spicy: 4.5, desc: '咖喱微辣带椰香，轻辣偏中' },
      { name: '云吞面', spicy: 0.5, desc: '清汤大地鱼香，不辣' },
      { name: '烧腊双拼', spicy: 0.0, desc: '烧味酱香，完全不辣' },
      { name: '菠萝油', spicy: 0.0, desc: '甜口茶餐厅经典，完全不辣' }
    ]
  },
  {
    name: '澳门特别行政区',
    shortName: '澳门',
    spicyLevel: 3.0,
    dishes: [
      { name: '非洲鸡', spicy: 6.0, desc: '葡式非洲鸡，椰香与辣椒交融，辣度不低' },
      { name: '葡国鸡', spicy: 3.5, desc: '咖喱椰浆微辣，轻辣' },
      { name: '马介休球', spicy: 1.0, desc: '鳕鱼薯球，不辣' },
      { name: '水蟹粥', spicy: 0.5, desc: '清鲜粥底，不辣' },
      { name: '葡式蛋挞', spicy: 0.0, desc: '焦糖奶香，完全不辣' }
    ]
  },

  /* ----------------------------- 西 南 ----------------------------- */
  {
    name: '重庆市',
    shortName: '重庆',
    spicyLevel: 9.0,
    dishes: [
      { name: '重庆火锅', spicy: 8.8, desc: '牛油老火锅，麻辣浓烈，越煮越辣，重庆辣度天花板' },
      { name: '毛血旺', spicy: 8.4, desc: '红油浸透，麻辣厚重，配米饭才扛得住' },
      { name: '辣子鸡', spicy: 7.8, desc: '干辣椒堆里找鸡块，香辣干爽' },
      { name: '万州烤鱼', spicy: 7.2, desc: '炭火烤制，香辣入味，重辣档' },
      { name: '水煮鱼', spicy: 6.8, desc: '麻辣鲜香，辣度中等偏重，重在花椒的麻' },
      { name: '重庆小面', spicy: 6.2, desc: '麻辣鲜香，辣度适中，重在复合调味' }
    ]
  },
  {
    name: '四川省',
    shortName: '四川',
    spicyLevel: 8.5,
    dishes: [
      { name: '四川火锅', spicy: 8.6, desc: '牛油红汤，麻辣兼具，四川辣度天花板' },
      { name: '毛血旺', spicy: 8.2, desc: '红油翻滚，麻辣厚重，越吃越上头' },
      { name: '辣子鸡', spicy: 7.8, desc: '干辣椒堆里找鸡块，香辣干爽' },
      { name: '水煮鱼', spicy: 6.8, desc: '麻辣鲜香，辣度中等偏重，重在花椒的麻' },
      { name: '夫妻肺片', spicy: 6.0, desc: '红油浓香，麻辣爽口，辣度中等' },
      { name: '麻婆豆腐', spicy: 5.2, desc: '麻辣入味，但辣度不算极端，麻味更突出' }
    ]
  },
  {
    name: '贵州省',
    shortName: '贵州',
    spicyLevel: 8.0,
    dishes: [
      { name: '辣子鸡', spicy: 8.0, desc: '糍粑辣椒炒制，香辣醇厚，贵州辣度代表' },
      { name: '折耳根蘸水', spicy: 7.0, desc: '糊辣椒蘸水，辣得层次丰富，爱憎分明' },
      { name: '酸汤鱼', spicy: 6.5, desc: '红酸汤开胃，酸辣平衡，中辣偏重' },
      { name: '肠旺面', spicy: 6.0, desc: '红油肠旺，辣度中等，早餐就开辣' },
      { name: '丝娃娃', spicy: 4.0, desc: '素菜卷，辣度全靠蘸水决定' }
    ]
  },
  {
    name: '云南省',
    shortName: '云南',
    spicyLevel: 7.5,
    dishes: [
      { name: '小米辣蘸水', spicy: 9.0, desc: '小米辣生捣，云南辣度天花板，一口封喉' },
      { name: '傣味鬼鸡', spicy: 7.0, desc: '小米辣加柠檬，酸辣凶猛，重辣' },
      { name: '过桥米线', spicy: 2.0, desc: '滚汤鲜香为主，辣度只是可选点缀' },
      { name: '汽锅鸡', spicy: 1.0, desc: '原汤清鲜，几乎不辣' },
      { name: '菠萝饭', spicy: 0.0, desc: '傣味甜口，完全不辣' }
    ]
  },
  {
    name: '西藏自治区',
    shortName: '西藏',
    spicyLevel: 3.0,
    dishes: [
      { name: '藏式火锅', spicy: 3.5, desc: '清汤锅底，蘸辣酱食用，轻辣' },
      { name: '牦牛肉干', spicy: 3.0, desc: '麻辣口味版本，轻辣有嚼劲' },
      { name: '藏面', spicy: 2.5, desc: '配一小碟辣酱，轻辣' },
      { name: '糌粑', spicy: 0.5, desc: '青稞主食，不辣' },
      { name: '酥油茶', spicy: 0.0, desc: '咸香奶香，完全不辣' }
    ]
  },

  /* ----------------------------- 西 北 ----------------------------- */
  {
    name: '陕西省',
    shortName: '陕西',
    spicyLevel: 5.5,
    dishes: [
      { name: '油泼面', spicy: 5.5, desc: '热油泼辣子，香而不燥，陕西辣度代表' },
      { name: 'biangbiang面', spicy: 5.0, desc: '宽面配辣子，香辣过瘾，中辣' },
      { name: '凉皮', spicy: 4.5, desc: '辣子油调味，酸辣爽口，轻辣偏中' },
      { name: '肉夹馍', spicy: 1.5, desc: '腊汁肉夹馍，几乎不辣' },
      { name: '羊肉泡馍', spicy: 1.0, desc: '原汤羊肉，不辣' }
    ]
  },
  {
    name: '甘肃省',
    shortName: '甘肃',
    spicyLevel: 4.0,
    dishes: [
      { name: '天水呱呱', spicy: 4.5, desc: '荞麦制品浇辣子，香辣突出，轻辣偏中' },
      { name: '酿皮子', spicy: 4.0, desc: '辣油加蒜汁，酸辣开胃，轻辣' },
      { name: '兰州牛肉面', spicy: 3.0, desc: '一清二白三红四绿，辣油香而不燥' },
      { name: '浆水面', spicy: 1.5, desc: '酸爽清淡，几乎不辣' },
      { name: '手抓羊肉', spicy: 0.5, desc: '原味手抓蘸椒盐，不辣' }
    ]
  },
  {
    name: '青海省',
    shortName: '青海',
    spicyLevel: 3.5,
    dishes: [
      { name: '炕锅羊肉', spicy: 5.5, desc: '香辣重口，青海湖边的硬菜，中辣' },
      { name: '酿皮', spicy: 4.0, desc: '辣油酸辣，轻辣' },
      { name: '尕面片', spicy: 2.5, desc: '汤面微辣，暖胃主食' },
      { name: '手抓羊肉', spicy: 0.5, desc: '原味不辣，只蘸椒盐' },
      { name: '青海老酸奶', spicy: 0.0, desc: '酸甜浓稠，完全不辣' }
    ]
  },
  {
    name: '宁夏回族自治区',
    shortName: '宁夏',
    spicyLevel: 4.0,
    dishes: [
      { name: '辣糊糊', spicy: 6.5, desc: '宁夏特色串串，辣糊糊底料浓稠，辣度不低' },
      { name: '羊肉臊子面', spicy: 3.5, desc: '汤面微辣，辣子提香' },
      { name: '烩羊杂碎', spicy: 3.0, desc: '辣油点味，轻辣暖身' },
      { name: '中卫蒿子面', spicy: 2.0, desc: '清淡爽口，轻辣' },
      { name: '手抓羊肉', spicy: 0.5, desc: '原汁原味，不辣' }
    ]
  },
  {
    name: '新疆维吾尔自治区',
    shortName: '新疆',
    spicyLevel: 3.5,
    dishes: [
      { name: '新疆椒麻鸡', spicy: 6.0, desc: '花椒与辣椒双管齐下，麻辣清爽，中辣' },
      { name: '大盘鸡', spicy: 5.5, desc: '皮带面泡辣汤，香辣过瘾，中辣' },
      { name: '拉条子', spicy: 3.5, desc: '拌面配辣子，轻辣' },
      { name: '烤羊肉串', spicy: 3.0, desc: '孜然辣椒面，微辣提香' },
      { name: '手抓饭', spicy: 0.5, desc: '胡萝卜羊肉清甜，不辣' }
    ]
  },

  /* ----------------------------- 港澳台已在上方，此处为台湾省 ----------------------------- */
  {
    name: '台湾省',
    shortName: '台湾',
    spicyLevel: 4.0,
    dishes: [
      { name: '台式麻辣锅', spicy: 7.0, desc: '鸭血豆腐无限续，麻辣中带中药香，重辣' },
      { name: '红烧牛肉面', spicy: 3.0, desc: '可加辣牛油，微辣提香' },
      { name: '三杯鸡', spicy: 2.0, desc: '九层塔与麻油香，微辣' },
      { name: '蚵仔煎', spicy: 1.5, desc: '甜辣酱点缀，几乎不辣' },
      { name: '卤肉饭', spicy: 1.0, desc: '咸甜卤汁，不辣' },
      { name: '棺材板', spicy: 0.5, desc: '奶油浓汤内馅，不辣' }
    ]
  }
];

/* --------------------------------------------------------------------------
 * 辣度等级文案：按题目要求固定为 6 档
 *   0 → 不辣 | 1-2 → 微辣 | 3-4 → 轻辣 | 5-6 → 中辣 | 7-8 → 重辣 | 9-10 → 极辣
 * ------------------------------------------------------------------------ */
window.SPICY_LEVELS = [
  { min: 0, max: 0, label: '不辣', color: '#f7f7f7' },
  { min: 1, max: 2, label: '微辣', color: '#fee5d9' },
  { min: 3, max: 4, label: '轻辣', color: '#fcbba1' },
  { min: 5, max: 6, label: '中辣', color: '#fc9272' },
  { min: 7, max: 8, label: '重辣', color: '#fb6a4a' },
  { min: 9, max: 10, label: '极辣', color: '#a50f15' }
];

/* --------------------------------------------------------------------------
 * 地图红色渐变（0-10 连续映射），与题目给定色阶完全一致：
 *   0 → #f7f7f7 | 2 → #fee5d9 | 4 → #fcbba1 | 6 → #fc9272 | 8 → #fb6a4a | 10 → #a50f15
 * ECharts 连续型 visualMap 会把 color 数组在 [min, max] 上均匀分布，
 * 6 个颜色正好落在 0 / 2 / 4 / 6 / 8 / 10 六个刻度上。
 * ------------------------------------------------------------------------ */
window.SPICY_COLORS = ['#f7f7f7', '#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#a50f15'];

/* 选中省份描边色 */
window.SPICY_SELECT_COLOR = '#7f1d1d';
