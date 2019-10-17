import React from 'react';

import Rate, { AndroidMarket } from 'react-native-rate'
import { getLocales } from 'react-native-localize';
import { say, openGitHub, openDonate } from '../../common';

export function carouselItems(refer) {
  let items = [];
  let lang;

  try {
    lang = getLocales()[0].languageCode;
  } catch (e) {
    lang = "en";
    console.warn(e);
  };

  // non-english sees translation card first
  if (lang !== "en")
    items.push(
      {
        title: say("we_translated_this"),
        subtitle: say("we_used_google_translate"),
        illustration: require('../../../img/translate.png'),
        onPress: () => openGitHub(),
      }
    );

  items.push(
    {
      title: say("contact_your_reps"),
      subtitle: say("know_who_represents_you"),
      illustration: require('../../../img/phone-your-rep.png'),
      onPress: () => refer.setState({active: 'reps'}),
    }
  );

  items.push(
    {
      title: say("canvas_for_any_cause"),
      subtitle: say("our_zero_cost_tool"),
      illustration: require('../../../img/canvassing.png'),
      onPress: () => refer.setState({active: 'canvassing'}),
    }
  );

  // since non-english got an extra card, need to swap one out to keep the count even
  if (lang === "en")
    items.push(
      {
        title: say("coming_zoon_desktop_tools"),
        subtitle: say("canvassing_at_scale"),
        illustration: require('../../../img/phone-banking.png'),
        onPress: () => openDonate(),
      }
    );

  items.push(
    {
      title: say("donate"),
      subtitle: say("we_operate_on_donations"),
      illustration: require('../../../img/donate.png'),
      onPress: () => openDonate(),
    }
  );

  items.push(
    {
      title: say("rate_this_app"),
      subtitle: say("feedback_helps_us"),
      illustration: require('../../../img/rate.png'),
      onPress: () => {
        let options = {
          AppleAppID: "1275301651",
          GooglePackageName: "org.ourvoiceinitiative.ourvoice",
          preferredAndroidMarket: AndroidMarket.Google,
          preferInApp: false,
          openAppStoreIfInAppFails: true,
        }
        Rate.rate(options, (success) => {});
      },
    }
  );

  items.push(
    {
      title: say("open_source_software"),
      subtitle: say("help_us_out_directly"),
      illustration: require('../../../img/open-source.png'),
      onPress: () => openGitHub(),
    }
  );

  return items;
}
