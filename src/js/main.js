/**
  Modified version of facebook_adblock by tiratatp: https://github.com/tiratatp/facebook_adblock
*/

// if e contains anything in blacklist, then hide.
const blacklist = [
  "._m8c",
  ".uiStreamSponsoredLink",
  'a[data-hovercard][href*="hc_ref=ADS"]',
  'a[role="button"][rel~="noopener"][data-lynx-mode="async"]',
];

// used for matching HTML elements and its attributes.
const possibleSponsoredTextQueries = [
  'a[role="link"] > span[aria-labelledby]',
  'div[role="button"] > span[aria-labelledby]',
];

const possibleSponsoredTextQueriesForOldFacebook = [
  'div[id^="feedsubtitle"] > :first-child',
  'div[id^="feed_sub_title"] > :first-child',
  'div[id^="feed__sub__title"] > :first-child',
  'div[id^="feedlabel"] > :first-child',
  'div[id^="fbfeed_sub_header_id"] > :nth-child(3)',
  'div[data-testid$="storysub-title"] > :first-child',
  'div[data-testid$="story-subtilte"] > :first-child',
  'div[data-testid$="story--subtilte"] > :first-child',
  'a[role="button"][aria-labelledby]',
  'div[data-testid*="subtitle"] > :first-child',
  'div[data-testid*="label"] > :first-child',
];

// string connected to sponsored content in different langs
const sponsoredTexts = [
  "Sponsored",
  "مُموَّل", // Arabic
  "赞助内容", // Chinese (Simplified)
  "贊助", // Chinese (Traditional)
  "Sponzorováno", // Czech
  "Gesponsord", // Dutch
  "May Sponsor", // Filipino
  "Commandité", // French (Canada)
  "Sponsorisé", // French
  "Gesponsert", // German
  "Χορηγούμενη", // Greek
  "ממומן", // Hebrew
  "प्रायोजित", // Hindi
  "Bersponsor", // Indonesian
  "Sponsorizzato", // Italian
  "Sponsorowane", // Polish
  "Patrocinado", // Portuguese (Brazil)
  "Реклама", // Russian
  "Sponzorované", // Slovak
  "Publicidad", // Spanish
  "ได้รับการสนับสนุน", // Thai
  "Sponsorlu", // Turkish
  "Được tài trợ", // Vietnamese
  "Sponsrad", // Swedish 1
  "Sponsras" // Swedish 2
];

/**
 * Facebook uses various techniques to hide an element
 * @param {Element} e
 * @returns {boolean} true if this element is hidden; Thus a text inside this element is not visible to the users.
 */
function isHidden(e) {
  const style = window.getComputedStyle(e);
  if (
    style.display === "none" ||
    style.opacity === "0" ||
    style.fontSize === "0px" ||
    style.visibility === "hidden" ||
    style.position === "absolute"
  ) {
    return true;
  }
  return false;
}

/**
 * Facebook uses various techniques to hide a text inside an element
 * @param {Element} e
 * @returns {string} a text hidden inside this DOM element; Returns an empty string if there is no hidden text.
 */
function getTextFromElement(e) {
  return (e.innerText === "" ? e.dataset.content : e.innerText) || "";
}

/**
 * For FB5, Facebook also hides a text directly inside a container element.
 * @param {Element} e
 * @returns {string} a text hidden inside this DOM element
 */
function getTextFromContainerElement(e) {
  // we only need the data-content of a container element, or any direct text inside it
  return (
    e.dataset.content ||
    Array.prototype.filter
    .call(e.childNodes, (element) => {
      return element.nodeType === Node.TEXT_NODE;
    })
    .map((element) => {
      return element.textContent;
    })
    .join("")
  );
}

/**
 * Return a text inside this given DOM element that is visible to the users
 * @param {Element} e
 * @returns {string}
 */
function getVisibleText(e) {
  if (isHidden(e)) {
    // stop if this is hidden
    return "";
  }
  const children = e.querySelectorAll(":scope > *");
  if (children.length !== 0) {
    // more level => recursive
    return (
      getTextFromContainerElement(e) +
      Array.prototype.slice.call(children).map(getVisibleText).flat().join("")
    );
  }
  // text has been identified
  return getTextFromElement(e);
}

/**
 Below are functions regarding the new Facebook design
*/

/**
 * Hide an element if this is a sponsored element that contains the string Hedvig
 * @param {String[]} possibleSponsoredTextQueries a list of selectors to look for a sponsored element
 * @param {Element} e DOM element
 * @returns {boolean} true if this is a sponsored element
 */
function hideIfSponsored(possibleSponsoredTextQueries, e) {

  // check if content matches the blacklist
  if (
    blacklist.some((query) => {
      if (e.querySelector(query) !== null) {
        // blocks sponsored content if it contains the string Hedvig.
        return blockContentIfTextContainsHedvig(e)
      }
      return false;
    })
  ) {
    return true; // has ad
  }

  // Look through a list of possible locations of "Sponsored" tag, and see if it matches our list of `sponsoredTexts`
  return possibleSponsoredTextQueries.some((query) => {
    const result = e.querySelectorAll(query);
    return [...result].some((t) => {
      const visibleText = getVisibleText(t);
      if (
        sponsoredTexts.some(
          (sponsoredText) => visibleText.indexOf(sponsoredText) !== -1
        )
      ) {
        // blocks sponsored content if it contains the string Hedvig.
        return blockContentIfTextContainsHedvig(e)
      }
      return false;
    });
  });
}

/**
 * Hide an element if sponsored element contains the string Hedvig
 * @param {Element} parent DOM element
 */
function blockContentIfTextContainsHedvig(parent) {
  let children = parent.getElementsByTagName('span')
  // look through all spans in matched element
  for (let x = 0; x < children.length; x++) {
    let child = children[x]
    // checks if child contains the string 'Hedvig'
    if (child.innerText === 'Hedvig') {
      console.log('Blocked sponsored Hedvig content.')
      parent.style.display = "none";
      parent.dataset.blocked = "sponsored";
      return true;
    }
  }
  return false
}

function hideIfSponsoredEvent(e) {
  return hideIfSponsored(possibleSponsoredTextQueries, e);
}

let newFeedObserver = null;

// wait for and observe FB5 feed element
function setFeedObserver() {
  // We are expecting to find a new feed div
  const feed = document.querySelector(
    "div[role=feed]:not([data-adblock-monitored])"
  );
  if (feed !== null) {
    // check existing posts
    feed
      .querySelectorAll('div[data-pagelet^="FeedUnit_"]')
      .forEach(hideIfSponsoredEvent);

    const feedContainer = feed.parentNode;
    // flag this feed as monitored
    feed.dataset.adblockMonitored = true;
    newFeedObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // check if feed was reloaded without changing page
        if (
          mutation.target === feedContainer &&
          mutation.addedNodes.length > 0
        ) {
          newFeedObserver.disconnect();
          // check again for the new feed. Since the DOM has just changed, we
          // want to wait a bit and start looking for the new div after it was
          // rendered. We put our method at the end of the current queue stack
          setTimeout(setFeedObserver, 0);
        }
        // new feed posts added
        if (mutation.target === feed && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (
              node.dataset.pagelet &&
              node.dataset.pagelet.startsWith("FeedUnit_")
            ) {
              hideIfSponsoredEvent(node);
            }
          });
        }
      });
    });
    // check for new feed posts
    newFeedObserver.observe(feed, {
      childList: true,
    });
    // check if the feed is replaced
    newFeedObserver.observe(feedContainer, {
      childList: true,
    });
  } else {
    // no feed div was available yet in DOM. will check again
    setTimeout(setFeedObserver, 1000);
  }
}

function onPageChange() {
  // there's a feed div that we don't monitor yet
  if (
    document.querySelector("div[role=feed]:not([data-adblock-monitored])") !==
    null
  ) {
    setFeedObserver();
    return;
  }
  // there's a feed loading placeholder
  if (document.getElementById("suspended-feed") !== null) {
    setFeedObserver();
    return;
  }
  // No new feed was detected
  // Cleanup observer when there's no feed monitored left in DOM
  if (
    newFeedObserver !== null &&
    document.querySelector("div[role=feed][data-adblock-monitored]") === null
  ) {
    newFeedObserver.disconnect();
    newFeedObserver = null;
  }
}

const pageObserver = new MutationObserver(onPageChange);

/**
 * Detect the current page and setup a page change observer.
 * This is because Facebook is using AJAX to load new content.
 *
 * THIS IS THE MAIN ENTRY POINT
 */
function setupPageObserverForNewFacebook() {
  // We are expecting to find a page div
  const pageDiv = document.querySelector(
    "div[data-pagelet=root] div[data-pagelet=page]"
  );
  // make sure there's a page element
  if (pageDiv !== null) {
    // trigger first page initiation
    onPageChange();

    // we need to observe the container of the page
    // for any page changes
    pageObserver.observe(pageDiv.parentNode, {
      childList: true,
    });
  } else {
    // no page div was available yet in DOM. will check again
    setTimeout(setupPageObserverForNewFacebook, 1000);
  }
}

/**
 Below are functions regarding the old Facebook design
*/

function hideIfSponsoredEventForOldFacebook(e) {
  return hideIfSponsored(possibleSponsoredTextQueriesForOldFacebook, e);
}

let feedObserverForOldFacebook = null;

function onPageChangeForOldFacebook() {
  let feed = document.getElementById("stream_pagelet");
  if (feed !== null) {
    // if the user change page to homepage
    feed
      .querySelectorAll('div[id^="hyperfeed_story_id_"]')
      .forEach(hideIfSponsoredEvent);
    feedObserverForOldFacebook = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.id.startsWith("hyperfeed_story_id_")) {
          hideIfSponsoredEventForOldFacebook(mutation.target);
        }
      });
    });
    feedObserverForOldFacebook.observe(feed, {
      childList: true,
      subtree: true,
    });
    return;
  }

  feed = document.getElementById("pagelet_group_");
  if (feed !== null) {
    // if the user change page to https://www.facebook.com/groups/*
    feed.querySelectorAll('div[id^="mall_post_"]').forEach(hideIfSponsoredEvent);
    feedObserverForOldFacebook = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.target
          .querySelectorAll('div[id^="mall_post_"]')
          .forEach(hideIfSponsoredEvent);
      });
    });
    feedObserverForOldFacebook.observe(feed, {
      childList: true,
      subtree: true,
    });
  }
}

const pageObserverForOldFacebook = new MutationObserver(onPageChangeForOldFacebook);

/**
 * Detect the current page and setup a page change observer.
 * This is because Facebook is using AJAX to load new content.
 *
 * THIS IS THE MAIN ENTRY POINT
 */
function setupPageObserverForOldFacebook() {
  // remove ads on first load
  onPageChangeForOldFacebook();

  const fbContent = document.getElementsByClassName("fb_content")[0];
  pageObserverForOldFacebook.observe(fbContent, {
    childList: true,
  });
}

/**
 * Detect if it is a classic Facebook layout
 * @returns {boolean} true if this is a classic Facebook layout
 */
function isClassicFacebook() {
  return document.getElementsByClassName("fb_content")[0] !== undefined;
}

/**
 * Detect if it is a new FB5 layout
 * @returns {boolean} true if this is a new FB5 layout
 */
function isFB5() {
  return document.getElementById("mount_0_0") !== null;
}



// Cleanup after unload
window.addEventListener("beforeunload", () => {
  if (isClassicFacebook()) {
    // Disconnect observer for old Facebook
    pageObserverForOldFacebook.disconnect();
    if (feedObserverForOldFacebook !== null) {
      feedObserverForOldFacebook.disconnect();
      feedObserverForOldFacebook = null;
    }
  } else if (isFB5()) {
    // Disconnect observer for new Facebook
    pageObserver.disconnect();
    if (newFeedObserver !== null) {
      newFeedObserver.disconnect();
      newFeedObserver = null;
    }
  }
});

/**
 * Calls observers based on clients Facebook version
 */
if (isClassicFacebook()) {
  // Old Facebook design
  console.log('Inits Hedvig AdBlocker extension for old Facebook')
  setupPageObserverForOldFacebook();
} else if (isFB5()) {
  // if it's FB5 design
  console.log('Inits Hedvig AdBlocker extension for new Facebook')
  setupPageObserverForNewFacebook();
}