/**
 * Canonical ANALYTICS_IDS Registry
 * Convention: <surface>.<area>.<component>.<element>[.<variant>]
 * Max 60 characters. No dynamic values in string (dynamic values go in properties).
 */

export const ANALYTICS_IDS = {
  // Global Shell & Layout
  global: {
    sidebar: {
      link: { item: 'wh.global.sidebar.link.item' },
      icon: { collapse: 'wh.global.sidebar.icon.collapse' },
    },
    topbar: {
      menu: { profile: 'wh.global.topbar.menu.profile', roleSwitch: 'wh.global.topbar.menu.role-switch' },
      icon: { notifications: 'wh.global.topbar.icon.notifications' },
      input: { search: 'wh.global.topbar.input.search' },
      toggle: { theme: 'wh.global.topbar.toggle.theme' },
    },
    toast: { btn: { action: 'wh.global.toast.btn.action' } },
    modal: { icon: { close: 'wh.global.modal.icon.close' } },
  },

  // Marketing & Hero Carousel
  marketing: {
    home: {
      banner: { promo: 'wh.marketing.home.banner.promo' },
      btn: { heroCta: 'wh.marketing.home.btn.hero-cta' },
      icon: { carouselNext: 'wh.marketing.home.icon.carousel-next', carouselPrev: 'wh.marketing.home.icon.carousel-prev' },
    },
    pricing: { card: { plan: 'wh.marketing.pricing.card.plan' } },
    checkout: { btn: { couponApply: 'wh.marketing.checkout.btn.coupon-apply' } },
  },

  // Schengen Portal & Country Selection
  schengen: {
    portal: {
      card: { country: 'wh.schengen.portal.card.country' },
      icon: { prev: 'wh.schengen.portal.icon.prev', next: 'wh.schengen.portal.icon.next' },
      dot: { select: 'wh.schengen.portal.dot.select' },
      section: { windowStage: 'wh.schengen.portal.section.window-stage' },
    },
  },

  // Student & University Discovery
  student: {
    dashboard: {
      card: { mentorSuggestion: 'wh.student.dashboard.card.mentor-suggestion' },
      icon: { notificationBell: 'wh.student.dashboard.icon.notification-bell' },
    },
    search: {
      filter: { chip: 'wh.student.search.chip.filter' },
      btn: { apply: 'wh.student.search.btn.apply' },
    },
  },

  // Auth & Onboarding
  auth: {
    login: { btn: { submit: 'wh.auth.login.btn.submit', sso: 'wh.auth.login.btn.sso' } },
    signup: { btn: { submit: 'wh.auth.signup.btn.submit' } },
  },
  onboarding: {
    role: { card: { select: 'wh.onboarding.role.card.select' } },
    campus: { input: { select: 'wh.onboarding.campus.input.select' } },
    complete: { btn: { finish: 'wh.onboarding.complete.btn.finish' } },
  },

  // Identity & Verification
  verify: {
    form: {
      btn: { submit: 'wh.verify.form.btn.submit' },
      input: { certId: 'wh.verify.form.input.cert-id' },
    },
  },

  // Agent K AI Workspace
  agentk: {
    sidebar: { btn: { newChat: 'wh.agentk.sidebar.btn.new-chat' } },
    composer: {
      btn: { send: 'wh.agentk.composer.btn.send', stop: 'wh.agentk.composer.btn.stop' },
      icon: { attach: 'wh.agentk.composer.icon.attach' },
    },
  },
} as const;

export type RegisteredElementId = typeof ANALYTICS_IDS;
