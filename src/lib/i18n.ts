export type Locale = "en" | "ko";

export const translations = {
  en: {
    // Landing
    tagline1: "Where every",
    tagline2: "pup finds",
    tagline3: "their pack",
    logIntoHobak: "Log into Hobak",
    emailPlaceholder: "Email address",
    passwordPlaceholder: "Password",
    logIn: "Log In",
    forgotPassword: "Forgot password?",
    createNewAccount: "Create new account",
    useAnotherProfile: "Use another profile",
    // Register
    signUp: "Sign Up",
    signUpSubtitle: "It's quick and easy.",
    displayNamePlaceholder: "Display name",
    usernamePlaceholder: "Username",
    newPasswordPlaceholder: "New password",
    confirmPasswordPlaceholder: "Confirm password",
    termsText: "By clicking Sign Up, you agree to our",
    terms: "Terms",
    privacyPolicy: "Privacy Policy",
    cookiesPolicy: "Cookies Policy",
    alreadyHaveAccount: "Already have an account?",
    // Login page
    createPage: "Create a Page for your dog, vet clinic, or dog park.",
    // Footer
    about: "About",
    help: "Help",
    privacy: "Privacy",
    cookies: "Cookies",
    developers: "Developers",
    // Errors
    enterEmailPassword: "Please enter your email and password.",
    loginFailed: "Login failed. Please try again.",
    registrationFailed: "Registration failed. Please try again.",
  },
  ko: {
    // Landing
    tagline1: "모든 강아지가",
    tagline2: "친구를 찾는",
    tagline3: "그 곳",
    logIntoHobak: "호박에 로그인",
    emailPlaceholder: "이메일 주소",
    passwordPlaceholder: "비밀번호",
    logIn: "로그인",
    forgotPassword: "비밀번호를 잊으셨나요?",
    createNewAccount: "새 계정 만들기",
    useAnotherProfile: "다른 프로필 사용",
    // Register
    signUp: "가입하기",
    signUpSubtitle: "빠르고 간단합니다.",
    displayNamePlaceholder: "이름",
    usernamePlaceholder: "사용자 이름",
    newPasswordPlaceholder: "새 비밀번호",
    confirmPasswordPlaceholder: "비밀번호 확인",
    termsText: "가입하기를 클릭하면 당사의",
    terms: "이용약관",
    privacyPolicy: "개인정보처리방침",
    cookiesPolicy: "쿠키 정책",
    alreadyHaveAccount: "이미 계정이 있으신가요?",
    // Login page
    createPage: "반려견, 동물병원 또는 반려견 공원 페이지를 만드세요.",
    // Footer
    about: "소개",
    help: "도움말",
    privacy: "개인정보",
    cookies: "쿠키",
    developers: "개발자",
    // Errors
    enterEmailPassword: "이메일과 비밀번호를 입력해주세요.",
    loginFailed: "로그인에 실패했습니다. 다시 시도해주세요.",
    registrationFailed: "가입에 실패했습니다. 다시 시도해주세요.",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function getLocale(): Locale {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem("hobak_locale") as Locale) || "en";
}

export function setLocale(locale: Locale): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("hobak_locale", locale);
  }
}

export function t(key: TranslationKey, locale: Locale): string {
  return translations[locale][key];
}
