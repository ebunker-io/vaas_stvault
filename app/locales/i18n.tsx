import i18n from 'i18next'
import enUsTrans from './en-us.json'
import zhCnTrans from './zh-cn.json'
import languageDetector from 'i18next-browser-languagedetector'
import {initReactI18next} from 'react-i18next'

i18n
  .use(languageDetector)
  .use(initReactI18next) //init i18next
  .init({
    //引入资源文件
    resources: {
      zh: {
        translation: zhCnTrans,
      },
      en: {
        translation: enUsTrans,
      },
    },
    // supportedLngs: ['zh', 'en'],
    //选择默认语言，选择内容为上述配置中的key，即en/zh
    fallbackLng: 'en',
    // lng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  })

export default i18n
