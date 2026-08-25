/*!
 * Frequency Generator - translations (English / Arabic)
 * Copyright (c) Quantum Billing. MIT License.
 *
 * Both languages live in one page rather than two builds, so a shared link
 * works for everyone and there is only ever one copy of the app to deploy.
 * ?lang=ar (or ?lang=en) forces a language; otherwise the stored choice wins,
 * then the browser's own preference.
 *
 * Numbers stay in Western digits in both languages: the readouts are
 * engineering values, and Arabic technical interfaces conventionally use them.
 */
(function (global, document) {
  'use strict';

  var DICT = {};

  DICT.en = {
    'meta.title': 'Frequency Generator · Quantum Billing',
    'meta.description': 'Multi-oscillator tone and frequency generator. 0 Hz to ultrasonic, multiple simultaneous waveforms, presets saved in your browser.',

    'skip': 'Skip to generators',
    'app.title': 'Frequency Generator',
    'app.tagline': 'Quantum Billing · open source, MIT',

    'lang.aria': 'Language',
    'lang.en': 'EN',
    'lang.ar': 'ع',
    'lang.switchToArabic': 'التبديل إلى العربية',
    'lang.switchToEnglish': 'Switch to English',

    'btn.playAll': 'Play all',
    'btn.stopAll': 'Stop all',
    'btn.add': 'Add',
    'btn.addWord': 'generator',

    'install.title': 'Add to your home screen',
    'install.body': 'Install this as a shortcut and it opens like an app, full screen and offline. No app store, nothing to download.',
    'install.button': 'Install',
    'install.dismiss': 'Not now',
    'install.ios': 'On iPhone and iPad: tap the Share button, then "Add to Home Screen".',
    'install.done': 'Installed. Look for the icon on your home screen.',

    'resume.text': 'Your last session had {count} generator(s) running.',
    'resume.play': 'Resume playback',
    'resume.dismiss': 'Dismiss',

    'scope.aria': 'Output visualiser',
    'scope.modes': 'Visualiser mode',
    'scope.wave': 'Scope',
    'scope.spectrum': 'Spectrum',
    'stats.active': 'Active',
    'stats.rate': 'Sample rate',
    'stats.max': 'Max freq',
    'stats.idle': 'idle',
    'master': 'Master',
    'master.aria': 'Master volume',

    'gen.aria': 'Generators',
    'gen.name': 'Generator name',
    'gen.default': 'Generator {n}',
    'gen.copy': '{name} copy',
    'gen.frequency': 'Frequency',
    'gen.frequencyHz': 'Frequency in hertz',
    'gen.volume': 'Volume',
    'gen.balance': 'Balance',
    'gen.waveform': 'Waveform',
    'gen.waveformAria': 'Waveform type',
    'gen.left': 'Left',
    'gen.center': 'Center',
    'gen.right': 'Right',
    'gen.play': 'Play',
    'gen.stop': 'Stop',
    'gen.solo': 'Solo (play only this one)',
    'gen.soloShort': 'S',
    'gen.duplicate': 'Duplicate',
    'gen.remove': 'Remove',

    'pan.center': 'Center',
    'pan.left': 'L {pct}%',
    'pan.right': 'R {pct}%',

    'band.dc': 'DC',
    'band.infrasound': 'Infrasound',
    'band.audible': 'Audible',
    'band.ultrasonic': 'Ultrasonic',

    'wave.sine': 'Sine',
    'wave.square': 'Square',
    'wave.sawtooth': 'Saw',
    'wave.triangle': 'Tri',
    'wave.desc.sine': 'Pure tone, no harmonics. Best for tuning, hearing tests and measurement.',
    'wave.desc.square': 'Odd harmonics, hard edges. Loud and buzzy; useful for testing clipping.',
    'wave.desc.sawtooth': 'All harmonics. The brightest and harshest of the four.',
    'wave.desc.triangle': 'Odd harmonics that fall off fast. Softer than square, richer than sine.',

    'deterrent.title': 'Animal and insect deterrent',
    'deterrent.intro': 'A phone speaker can be used to try to move animals along. Each button adds a generator at the frequency usually claimed for that animal — nothing plays until you press Play on the card.',
    'deterrent.mosquito': 'Mosquitoes',
    'deterrent.rodent': 'Rodents',
    'deterrent.cat': 'Cats',
    'deterrent.dog': 'Dogs',
    'deterrent.honest': 'Be realistic about this. Independent studies have repeatedly found ultrasonic mosquito repellents ineffective, and results for cats, dogs and rodents are mixed at best — animals often simply get used to the sound. Most phone speakers also roll off above roughly 15 kHz, so they may emit almost nothing at these frequencies even at full volume.',
    'deterrent.care': 'Do not aim it at a pet at close range or leave it running near one. These frequencies are well inside a cat or dog’s hearing range and can distress them, and anything you cannot hear can still be loud enough to damage hearing — including children’s and young adults’, who hear higher frequencies than you do.',

    'presets.aria': 'Presets and data',
    'presets.title': 'Presets',
    'presets.hint': 'Everything is stored in this browser only. Your current setup is saved automatically and restored next time.',
    'presets.name': 'Preset name',
    'presets.save': 'Save current',
    'presets.saved': 'Saved presets',
    'presets.load': 'Load',
    'presets.delete': 'Delete',
    'presets.none': 'No presets saved yet',
    'presets.export': 'Export JSON',
    'presets.import': 'Import JSON',
    'presets.reset': 'Reset all',

    'safety.aria': 'Safety notice',
    'safety.title': 'Before you turn it up',
    'safety.1': 'Start at a low volume. Sustained tones can damage hearing and speakers.',
    'safety.2': 'Ultrasonic content above ~20 kHz is inaudible but still real energy — tweeters can overheat.',
    'safety.3': 'Frequencies below ~20 Hz mostly move air, not sound. Most phone speakers reproduce neither end.',
    'safety.4': 'The usable top end is half the audio sample rate shown above (Nyquist limit).',

    'footer.copy': '© {year} Quantum Billing — released under the MIT License.',
    'footer.source': 'Source on GitHub',
    'footer.phase': 'Phase 1: web. Android & iOS to follow.',

    'notice.noAudio': 'This browser has no Web Audio support, so no tone can be generated.',
    'notice.audioFailed': 'Audio could not be started.',
    'notice.audioInit': 'Audio could not be initialised.',
    'notice.storageBlocked': 'Local storage is blocked in this browser, so settings will not be remembered.',
    'notice.limit': '32 generators is the limit — that is already a lot of simultaneous tones.',
    'notice.presetName': 'Give the preset a name first.',
    'notice.presetStorage': 'This browser is blocking local storage, so presets cannot be saved.',
    'notice.badJson': 'That file is not valid JSON.',
    'notice.unreadable': 'That file could not be read.',
    'confirm.overwrite': 'Overwrite the preset "{name}"?',
    'confirm.deletePreset': 'Delete the preset "{name}"?',
    'confirm.reset': 'Delete every generator and every saved preset in this browser?'
  };

  DICT.ar = {
    'meta.title': 'مولّد الترددات · كوانتم بيلينج',
    'meta.description': 'مولّد نغمات وترددات متعدد المذبذبات. من 0 هرتز إلى ما فوق الصوتي، مع عدة موجات في وقت واحد وإعدادات محفوظة في متصفحك.',

    'skip': 'تخطَّ إلى المولّدات',
    'app.title': 'مولّد الترددات',
    'app.tagline': 'كوانتم بيلينج · مفتوح المصدر، رخصة MIT',

    'lang.aria': 'اللغة',
    'lang.en': 'EN',
    'lang.ar': 'ع',
    'lang.switchToArabic': 'التبديل إلى العربية',
    'lang.switchToEnglish': 'Switch to English',

    'btn.playAll': 'تشغيل الكل',
    'btn.stopAll': 'إيقاف الكل',
    'btn.add': 'إضافة',
    'btn.addWord': 'مولّد',

    'install.title': 'أضِفه إلى شاشتك الرئيسية',
    'install.body': 'ثبّته كاختصار ليفتح مثل أي تطبيق، بملء الشاشة وبدون إنترنت. لا متجر تطبيقات ولا تنزيل.',
    'install.button': 'تثبيت',
    'install.dismiss': 'ليس الآن',
    'install.ios': 'على iPhone وiPad: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».',
    'install.done': 'تم التثبيت. ستجد الأيقونة على شاشتك الرئيسية.',

    'resume.text': 'كان لديك {count} مولّد قيد التشغيل في الجلسة السابقة.',
    'resume.play': 'استئناف التشغيل',
    'resume.dismiss': 'تجاهل',

    'scope.aria': 'عارض المخرجات',
    'scope.modes': 'وضع العرض',
    'scope.wave': 'الراسم',
    'scope.spectrum': 'الطيف',
    'stats.active': 'نشط',
    'stats.rate': 'معدل العينات',
    'stats.max': 'أقصى تردد',
    'stats.idle': 'خامل',
    'master': 'الرئيسي',
    'master.aria': 'مستوى الصوت الرئيسي',

    'gen.aria': 'المولّدات',
    'gen.name': 'اسم المولّد',
    'gen.default': 'مولّد {n}',
    'gen.copy': 'نسخة {name}',
    'gen.frequency': 'التردد',
    'gen.frequencyHz': 'التردد بالهرتز',
    'gen.volume': 'مستوى الصوت',
    'gen.balance': 'التوازن',
    'gen.waveform': 'شكل الموجة',
    'gen.waveformAria': 'نوع الموجة',
    'gen.left': 'يسار',
    'gen.center': 'الوسط',
    'gen.right': 'يمين',
    'gen.play': 'تشغيل',
    'gen.stop': 'إيقاف',
    'gen.solo': 'منفرد (تشغيل هذا وحده)',
    'gen.soloShort': 'م',
    'gen.duplicate': 'تكرار',
    'gen.remove': 'حذف',

    'pan.center': 'الوسط',
    'pan.left': 'يسار {pct}%',
    'pan.right': 'يمين {pct}%',

    'band.dc': 'تيار مستمر',
    'band.infrasound': 'دون صوتية',
    'band.audible': 'مسموعة',
    'band.ultrasonic': 'فوق صوتية',

    'wave.sine': 'جيبية',
    'wave.square': 'مربعة',
    'wave.sawtooth': 'منشارية',
    'wave.triangle': 'مثلثة',
    'wave.desc.sine': 'نغمة نقية بلا توافقيات. الأنسب للضبط واختبارات السمع والقياس.',
    'wave.desc.square': 'توافقيات فردية وحواف حادة. صوت عالٍ وخشن، ومفيد لاختبار القص.',
    'wave.desc.sawtooth': 'تحتوي على كل التوافقيات. الأكثر سطوعًا وحدّة بين الأربعة.',
    'wave.desc.triangle': 'توافقيات فردية تتلاشى بسرعة. أنعم من المربعة وأغنى من الجيبية.',

    'deterrent.title': 'إبعاد الحيوانات والحشرات',
    'deterrent.intro': 'يمكن استخدام سمّاعة الهاتف لمحاولة إبعاد الحيوانات. كل زر يضيف مولّدًا على التردد المُتداول لذلك الحيوان، ولا يصدر أي صوت حتى تضغط «تشغيل» على البطاقة.',
    'deterrent.mosquito': 'البعوض',
    'deterrent.rodent': 'القوارض',
    'deterrent.cat': 'القطط',
    'deterrent.dog': 'الكلاب',
    'deterrent.honest': 'كن واقعيًا في توقعاتك. أثبتت دراسات مستقلة مرارًا أن طاردات البعوض فوق الصوتية غير فعّالة، والنتائج مع القطط والكلاب والقوارض متفاوتة في أفضل الأحوال إذ تعتاد الحيوانات على الصوت غالبًا. كما أن أغلب سمّاعات الهواتف تضعف استجابتها فوق 15 كيلوهرتز تقريبًا، وقد لا تُصدر شيئًا يُذكر عند هذه الترددات حتى بأقصى مستوى صوت.',
    'deterrent.care': 'لا توجّهه إلى حيوان أليف من مسافة قريبة ولا تتركه يعمل بجواره. هذه الترددات تقع في صميم مدى سمع القطط والكلاب وقد تسبب لها ضيقًا شديدًا، وما لا تسمعه أنت قد يظل عاليًا بما يكفي لإيذاء السمع — بما في ذلك سمع الأطفال والشباب الذين يسمعون ترددات أعلى منك.',

    'presets.aria': 'الإعدادات والبيانات',
    'presets.title': 'الإعدادات المحفوظة',
    'presets.hint': 'كل شيء يُحفظ في هذا المتصفح فقط. يُحفظ إعدادك الحالي تلقائيًا ويُستعاد في زيارتك القادمة.',
    'presets.name': 'اسم الإعداد',
    'presets.save': 'حفظ الحالي',
    'presets.saved': 'الإعدادات المحفوظة',
    'presets.load': 'تحميل',
    'presets.delete': 'حذف',
    'presets.none': 'لا توجد إعدادات محفوظة بعد',
    'presets.export': 'تصدير JSON',
    'presets.import': 'استيراد JSON',
    'presets.reset': 'إعادة تعيين الكل',

    'safety.aria': 'تنبيه السلامة',
    'safety.title': 'قبل أن ترفع الصوت',
    'safety.1': 'ابدأ بمستوى صوت منخفض. النغمات المستمرة قد تؤذي السمع وتتلف السمّاعات.',
    'safety.2': 'ما فوق 20 كيلوهرتز غير مسموع لكنه طاقة حقيقية — وقد ترتفع حرارة سمّاعات الترددات العالية.',
    'safety.3': 'الترددات دون 20 هرتز تحرّك الهواء أكثر مما تُسمع. وأغلب سمّاعات الهواتف لا تُنتج أيًّا من الطرفين.',
    'safety.4': 'أقصى تردد قابل للاستخدام هو نصف معدل العينات المعروض أعلاه (حد نايكويست).',

    'footer.copy': '© {year} كوانتم بيلينج — منشور برخصة MIT.',
    'footer.source': 'الشيفرة المصدرية على GitHub',
    'footer.phase': 'المرحلة 1: الويب. تطبيقا أندرويد وiOS لاحقًا.',

    'notice.noAudio': 'هذا المتصفح لا يدعم Web Audio، لذا لا يمكن توليد أي نغمة.',
    'notice.audioFailed': 'تعذّر تشغيل الصوت.',
    'notice.audioInit': 'تعذّرت تهيئة الصوت.',
    'notice.storageBlocked': 'التخزين المحلي محجوب في هذا المتصفح، لذا لن يتم تذكّر الإعدادات.',
    'notice.limit': '32 مولّدًا هو الحد الأقصى — وهذا عدد كبير من النغمات المتزامنة أصلًا.',
    'notice.presetName': 'اكتب اسمًا للإعداد أولًا.',
    'notice.presetStorage': 'هذا المتصفح يحجب التخزين المحلي، لذا لا يمكن حفظ الإعدادات.',
    'notice.badJson': 'هذا الملف ليس JSON صالحًا.',
    'notice.unreadable': 'تعذّرت قراءة هذا الملف.',
    'confirm.overwrite': 'هل تريد استبدال الإعداد «{name}»؟',
    'confirm.deletePreset': 'هل تريد حذف الإعداد «{name}»؟',
    'confirm.reset': 'هل تريد حذف كل المولّدات وكل الإعدادات المحفوظة في هذا المتصفح؟'
  };

  var RTL = { ar: true };
  var current = 'en';
  var listeners = [];

  function t(key, params) {
    var table = DICT[current] || DICT.en;
    var text = table[key];
    if (text === undefined) text = DICT.en[key];
    if (text === undefined) return key;
    if (params) {
      for (var name in params) {
        if (Object.prototype.hasOwnProperty.call(params, name)) {
          text = text.split('{' + name + '}').join(params[name]);
        }
      }
    }
    return text;
  }

  /** Fill in every element carrying a data-i18n* attribute under `root`. */
  function apply(root) {
    var scope = root || document;

    var nodes = scope.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    }

    var attrNodes = scope.querySelectorAll('[data-i18n-attr]');
    for (var j = 0; j < attrNodes.length; j++) {
      /* "placeholder:presets.name;title:gen.solo" */
      var pairs = attrNodes[j].getAttribute('data-i18n-attr').split(';');
      for (var k = 0; k < pairs.length; k++) {
        var pair = pairs[k].split(':');
        if (pair.length === 2) attrNodes[j].setAttribute(pair[0].trim(), t(pair[1].trim()));
      }
    }
  }

  function detect() {
    var match = /[?&]lang=(ar|en)\b/i.exec(global.location.search);
    if (match) return match[1].toLowerCase();

    var stored = global.FreqStore && global.FreqStore.getPref('lang', null);
    if (stored === 'ar' || stored === 'en') return stored;

    var nav = (global.navigator.language || global.navigator.userLanguage || 'en').toLowerCase();
    return nav.indexOf('ar') === 0 ? 'ar' : 'en';
  }

  function set(lang, options) {
    if (!DICT[lang]) lang = 'en';
    current = lang;

    var html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', RTL[lang] ? 'rtl' : 'ltr');

    document.title = t('meta.title');
    var description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', t('meta.description'));

    apply(document);

    if (!options || options.persist !== false) {
      if (global.FreqStore) global.FreqStore.setPref('lang', lang);
    }

    for (var i = 0; i < listeners.length; i++) listeners[i](lang);
  }

  global.I18N = {
    t: t,
    apply: apply,
    set: set,
    detect: detect,
    current: function () { return current; },
    isRTL: function () { return !!RTL[current]; },
    onChange: function (fn) { listeners.push(fn); },
    languages: ['en', 'ar'],
    dict: DICT
  };
})(window, document);
