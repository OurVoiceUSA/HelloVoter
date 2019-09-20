import React, { PureComponent } from 'react';

import * as RNLocalize from "react-native-localize";
import i18n from "i18n-js";

import {
  I18nManager,
} from 'react-native';

import { say } from '../common';

const translationGetters = {
  // lazy requires (metro bundler does not support symlinks)
  en: () => require("../translations/en.json"),
  es: () => require("../translations/es.json")
};

const setI18nConfig = () => {
  // fallback if no available language fits
  const fallback = { languageTag: "en", isRTL: false };

  const { languageTag, isRTL } =
    RNLocalize.findBestAvailableLanguage(Object.keys(translationGetters)) ||
    fallback;

  // clear translation cache
  say.cache.clear();
  // update layout direction
  I18nManager.forceRTL(isRTL);
  // set i18n-js config
  i18n.translations = { [languageTag]: translationGetters[languageTag]() };
  i18n.locale = languageTag;
};

export default class HVComponent extends PureComponent {

  constructor(props) {
    super(props);
    setI18nConfig();
  }

}

