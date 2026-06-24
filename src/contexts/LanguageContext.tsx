'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, LanguageContextType } from '@/types';

// Translation strings
const translations = {
  // Navigation
  home: { en: 'Home', sw: 'Home' },
  search: { en: 'Search', sw: 'Tafuta' },
  settings: { en: 'Settings', sw: 'Mipangilio' },
  profile: { en: 'Profile', sw: 'Wasifu' },
  movies: { en: 'Movies', sw: 'Filamu' },
  series: { en: 'Series', sw: 'Series' },
  stories: { en: 'Stories', sw: 'Simulizi' },
  story: { en: 'Story', sw: 'Simulizi' },
  readStory: { en: 'Read Story', sw: 'Soma Simulizi' },
  startReading: { en: 'Start Reading', sw: 'Anza Kusoma' },
  subscribeToRead: { en: 'Subscribe to Read', sw: 'Subscribe Ili Kusoma' },
  storyContent: { en: 'Story Content', sw: 'Maudhui ya Simulizi' },
  premiumContent: { en: 'Premium Content', sw: 'Maudhui ya Hali ya Juu' },
  subscribeToReadStory: { en: 'Subscribe to read this story', sw: 'Lipia ili kusoma simulizi hii na zingine zote kulingana na plani yako utakayochagua' },
  viewSubscriptionPlans: { en: 'View Subscription Plans', sw: 'Angalia Subscription Plan' },
  storyNotFound: { en: 'Story not found', sw: 'Simulizi haijapatikana' },
  storyNotFoundMessage: { en: 'The story you\'re looking for doesn\'t exist or has been removed.', sw: 'Simulizi unayoitafuta haipo au imefutwa.' },
  goBack: { en: 'Go Back', sw: 'Rudi Nyuma' },
  storyStats: { en: 'Story Statistics', sw: 'Takwimu za Simulizi' },
  minutes: { en: 'Minutes', sw: 'Dakika' },
  genres: { en: 'Genres', sw: 'Aina' },
  totalStories: { en: 'Total Stories', sw: 'Jumla ya Simulizi' },
  totalViews: { en: 'Total Views', sw: 'Jumla ya Maoni' },
  readTime: { en: 'Read Time', sw: 'Muda wa Kusoma' },
  estimatedReadTime: { en: 'Estimated Read Time', sw: 'Muda wa Kusoma Unakadiriwa' },
  minRead: { en: 'min read', sw: 'dakika za kusoma' },
  readAmazingStories: { en: 'Read amazing stories from East Africa', sw: 'Soma simulizi za kuvutia kutoka Afrika Mashariki' },
  subscriptions: { en: 'My Subscriptions', sw: 'Subscription Zangu' },
  admin: { en: 'Admin Panel', sw: 'Paneli ya Admini' },

  // Authentication
  login: { en: 'Login', sw: 'Ingia' },
  logout: { en: 'Logout', sw: 'Toka' },
  phoneNumber: { en: 'Phone Number', sw: 'Nambari ya Simu' },
  enterPhone: { en: 'Enter your phone number', sw: 'Ingiza nambari yako ya simu' },
  name: { en: 'Name', sw: 'Jina' },
  username: { en: 'Username', sw: 'Jina la Mtumiaji' },
  email: { en: 'Email', sw: 'Barua Pepe' },
  password: { en: 'Password', sw: 'Nenosiri' },

  // Profile
  editProfile: { en: 'Edit Profile', sw: 'Hariri Wasifu' },
  profilePhoto: { en: 'Profile Photo', sw: 'Picha ya Wasifu' },
  photoUrl: { en: 'Photo URL', sw: 'Kiungo cha Picha' },
  save: { en: 'Save', sw: 'Hifadhi' },
  cancel: { en: 'Cancel', sw: 'Ghairi' },

  // Content
  featured: { en: 'Featured', sw: 'Zilizoangaziwa' },
  trending: { en: 'Trending', sw: 'Zinazovuma' },
  newReleases: { en: 'New Releases', sw: 'Zilizotolewa Hivi Karibuni' },
  watchNow: { en: 'Watch Now', sw: 'Tazama Sasa' },
  readNow: { en: 'Read Now', sw: 'Soma Sasa' },
  duration: { en: 'Duration', sw: 'Muda' },
  genre: { en: 'Genre', sw: 'Aina' },
  language: { en: 'Language', sw: 'Lugha' },
  releaseDate: { en: 'Release Date', sw: 'Tarehe ya Kutolewa' },

  // Subscriptions
  subscribe: { en: 'Subscribe', sw: 'Jiunge' },
  subscriptionPlans: { en: 'Subscription Plans', sw: 'Plani ya Subscription' },
  choosePerfectPlan: { en: 'Choose the perfect plan for your entertainment needs', sw: 'Chagua kifurushi ukipendacho kwa matumizi yako' },
  currentPlan: { en: 'Current Plan', sw: 'Mpango wa Sasa' },
  expiresOn: { en: 'Expires On', sw: 'Inaisha Tarehe' },
  renewPlan: { en: 'Renew Plan', sw: 'Sasisha Mpango' },
  upgradePlan: { en: 'Upgrade Plan', sw: 'Pandisha Mpango' },

  // Subscription packages
  fedha: { en: 'FEDHA (3 Days)', sw: 'FEDHA (Siku 3)' },
  chuma: { en: 'CHUMA (7 Days)', sw: 'CHUMA (Siku 7)' },
  dhahabu: { en: 'DHAHABU (14 Days)', sw: 'DHAHABU (Siku 14)' },
  almasi: { en: 'ALMASI (30 Days)', sw: 'ALMASI (Siku 30)' },
  malkia: { en: 'MALKIA (180 Days)', sw: 'MALKIA (Siku 180)' },

  // Common
  loading: { en: 'Loading...', sw: 'Inapakia...' },
  error: { en: 'Error', sw: 'Hitilafu' },
  success: { en: 'Success', sw: 'Imefanikiwa' },
  tryAgain: { en: 'Try Again', sw: 'Jaribu Tena' },
  close: { en: 'Close', sw: 'Funga' },
  open: { en: 'Open', sw: 'Fungua' },
  back: { en: 'Back', sw: 'Rudi' },
  next: { en: 'Next', sw: 'Ifuatayo' },
  previous: { en: 'Previous', sw: 'Iliyotangulia' },

  // Languages
  english: { en: 'English', sw: 'Kiingereza' },
  swahili: { en: 'Swahili', sw: 'Kiswahili' },

  // Categories
  horror: { en: 'Horror', sw: 'Vitisho' },
  romance: { en: 'Romance', sw: 'Mapenzi' },
  action: { en: 'Action', sw: 'Vitendo' },
  comedy: { en: 'Comedy', sw: 'Ucheshi' },
  drama: { en: 'Drama', sw: 'Mchezo' },
  thriller: { en: 'Thriller', sw: 'Msisimko' },
  adventure: { en: 'Adventure', sw: 'Uchunguzi' },
  documentary: { en: 'Documentary', sw: 'Nyaraka za Video' },

  // Payment
  payment: { en: 'Payment', sw: 'Malipo' },
  payNow: { en: 'Pay Now', sw: 'Lipa Sasa' },
  paymentMethod: { en: 'Payment Method', sw: 'Njia ya Malipo' },
  mobileMoney: { en: 'Mobile Money', sw: 'Pesa za Simu' },
  paymentSuccess: { en: 'Payment Successful', sw: 'Malipo Yamefanikiwa' },
  paymentFailed: { en: 'Payment Failed', sw: 'Malipo Yameshindwa' },
  paymentPending: { en: 'Payment Pending', sw: 'Malipo Yanangoja' },
  paymentHistory: { en: 'Payment History', sw: 'Historia ya Malipo' },
  downloadReceipt: { en: 'Download Receipt', sw: 'Pakua Risiti' },
  
  // Payment Status
  completed: { en: 'Completed', sw: 'Imekamilika' },
  pending: { en: 'Pending', sw: 'Inangoja' },
  failed: { en: 'Failed', sw: 'Imeshindwa' },
  cancelled: { en: 'Cancelled', sw: 'Imefutwa' },
  checking: { en: 'Checking', sw: 'Inakaguliwa' },
  
  // Payment Process
  paymentRequestSent: { en: 'Payment request sent to your phone. Please complete the payment.', sw: 'Ombi la malipo limetumwa kwa simu yako. Tafadhali kamilisha malipo.' },
  checkingPaymentStatus: { en: 'Checking payment status...', sw: 'Inakaguliwa hali ya malipo...' },
  paymentCompletedSuccessfully: { en: 'Payment completed successfully! Processing subscription...', sw: 'Malipo yamekamilika kikamilifu! Inachakatwa subscription...' },
  paymentProcessing: { en: 'Payment is being processed...', sw: 'Malipo yanachakatwa...' },
  paymentTimeout: { en: 'Payment timeout. Please try again.', sw: 'Muda wa malipo umeisha. Tafadhali jaribu tena.' },
  
  // Payment Instructions
  checkPhonePrompt: { en: 'Check your phone for payment prompt', sw: 'Angalia simu yako kwa ujumbe wa malipo' },
  enterPinPrompt: { en: 'Enter your PIN when prompted', sw: 'Ingiza PIN yako unapoulizwa' },
  waitForConfirmation: { en: 'Wait for confirmation', sw: 'Subiri uthibitisho' },
  subscriptionWillActivate: { en: 'Your subscription will be activated automatically upon successful payment', sw: 'Subscription yako yatawashwa kiotomatiki baada ya malipo yanayofanikiwa' },
  checkingPaymentStatusAuto: { en: 'Checking payment status automatically...', sw: 'Inakaguliwa hali ya malipo kiotomatiki...' },
  
  // Payment Warnings
  defaultNumberWarning: { en: 'This number is the one you used when signing up to your account, so it will be used for payment for security purposes. You cannot change it, so please ensure you have sufficient funds in the account with this exact number.', sw: 'Nambari hii ni ile uliyotumia wakati wa kujiandikisha kwenye akaunti yako, kwa hivyo itatumika kwa malipo kwa ajili ya usalama. Haiwezi kubadilishwa, kwa hivyo hakikisha una pesa za kutosha katika akaunti na nambari hii hasa.' },
  minimumAmountWarning: { en: 'You must have more than the indicated amount in your account. For example, to pay TSh 2,000, you need more than TSh 2,000 in your account.', sw: 'Lazima uwe na zaidi ya kiasi kilichoonyeshwa katika akaunti yako. Kwa mfano, kulipa TSh 2,000, unahitaji zaidi ya TSh 2,000 katika akaunti yako.' },
  
  // Subscription Status
  active: { en: 'Active', sw: 'Inatumika' },
  inactive: { en: 'Inactive', sw: 'Haijatumika' },
  expired: { en: 'Expired', sw: 'Imeisha' },
  renewal: { en: 'Renewal', sw: 'Ufuatiliaji' },
  upgrade: { en: 'Upgrade', sw: 'Kupandisha' },
  from: { en: 'From', sw: 'Kutoka' },
  currentlyActive: { en: 'Currently active subscription', sw: 'Subscription inayotumika sasa' },
  
  // Admin Panel
  adminPanel: { en: 'Admin Panel', sw: 'Paneli ya Admini' },
  manageUsers: { en: 'Manage Users', sw: 'Simamia Watumiaji' },
  managePayments: { en: 'Manage Payments', sw: 'Simamia Malipo' },
  manageContent: { en: 'Manage Content', sw: 'Simamia Maudhui' },
  manageAdmins: { en: 'Manage Admins', sw: 'Simamia Wasimamizi' },
  totalUsers: { en: 'Total Users', sw: 'Jumla ya Watumiaji' },
  totalPayments: { en: 'Total Payments', sw: 'Jumla ya Malipo' },
  totalRevenue: { en: 'Total Revenue', sw: 'Jumla ya Mapato' },
  manual: { en: 'Manual', sw: 'Mkono' },
  blocked: { en: 'Blocked', sw: 'Imezuiwa' },
  
  // Common Actions
  view: { en: 'View', sw: 'Angalia' },
  edit: { en: 'Edit', sw: 'Hariri' },
  delete: { en: 'Delete', sw: 'Futa' },
  confirm: { en: 'Confirm', sw: 'Thibitisha' },
  filter: { en: 'Filter', sw: 'Chuja' },
  refresh: { en: 'Refresh', sw: 'Sasisha' },
  
  // Time and Date
  today: { en: 'Today', sw: 'Leo' },
  yesterday: { en: 'Yesterday', sw: 'Jana' },
  thisWeek: { en: 'This Week', sw: 'Wiki Hii' },
  thisMonth: { en: 'This Month', sw: 'Mwezi Huu' },
  lastMonth: { en: 'Last Month', sw: 'Mwezi Ulopita' },
  createdAt: { en: 'Created At', sw: 'Imeundwa Tarehe' },
  updatedAt: { en: 'Updated At', sw: 'Imesasishwa Tarehe' },
  completedAt: { en: 'Completed At', sw: 'Imekamilika Tarehe' },
  
  // Timer and Countdown
  timeRemaining: { en: 'Time Remaining', sw: 'Muda Uliobaki' },
  daysRemaining: { en: 'Days Remaining', sw: 'Siku Zilizobaki' },
  hoursRemaining: { en: 'Hours Remaining', sw: 'Masaa Yaliyoachwa' },
  minutesRemaining: { en: 'Minutes Remaining', sw: 'Dakika Zilizoachwa' },
  secondsRemaining: { en: 'Seconds Remaining', sw: 'Sekunde Zilizoachwa' },
  liveCountdown: { en: 'Live Countdown', sw: 'Hesabu ya Muda ya Moja kwa Moja' },
  
  // WhatsApp Contact
  contactAdmin: { en: 'Contact Admin', sw: 'Wasiliana na Admini' },
  whatsappSupport: { en: 'WhatsApp Support', sw: 'Msaada wa WhatsApp' },
  paymentIssueMessage: { en: 'Hello Admin, I have made a payment but my subscription has not been activated. Please help me resolve this issue. I will share my payment receipt with you.', sw: 'Hujambo Admini, nimefanya malipo lakini subscription yangu haipo active. Tafadhali nisaidie kutatua tatizo hili. Nitaunganisha risiti yangu ya malipo na wewe.' },
  generalContactMessage: { en: 'Hello Admin, I need assistance with my account. Please help me.', sw: 'Hujambo Admini, ninahitaji msaada kuhusu akaunti yangu. Tafadhali nisaidie.' },
  shareReceipt: { en: 'Share Receipt with Admin', sw: 'share risiti yako ya malipo na admin' },
  contactForHelp: { en: 'Contact Admin for Help', sw: 'Wasiliana na Admini kwa Msaada' },
  paymentNotActivated: { en: 'Payment made but subscription not activated?', sw: 'Umelipa lakini subscription haipo active?' },
  paymentNotActivatedMessage: { en: 'If you have made a payment but your subscription has not been activated, please contact the admin via WhatsApp. You will need to share your payment receipt.', sw: 'Kama umefanya malipo lakini subscription yako haijawashwa, tafadhali wasiliana na admini kupitia WhatsApp. Utahitajika kushare risiti yako ya malipo.' },
  needHelp: { en: 'Need Help?', sw: 'Unahitaji Msaada?' },
  
  // Error Messages
  noPaymentHistory: { en: 'No Payment History', sw: 'Hakuna Historia ya Malipo' },
  noPaymentsYet: { en: 'You haven\'t made any payments yet', sw: 'Hujafanya malipo yoyote bado' },
  viewPaymentHistory: { en: 'View Payment History', sw: 'Angalia Historia ya Malipo' },
  payments: { en: 'Payments', sw: 'Malipo' },
  needToTestPayments: { en: 'Need to test payments?', sw: 'Unahitaji kujaribu malipo?' },
  createTestUser: { en: 'Create Test User', sw: 'Tengeneza Mtumiaji wa Majaribio' },
  noSubscriptionHistory: { en: 'No Subscription History', sw: 'Hakuna Historia ya Subscription' },
  noSubscriptionsYet: { en: 'You don\'t have any subscriptions yet', sw: 'Huna subscription yoyote bado' },
  testUserCreated: { en: 'Test user created successfully! You can now make payments.', sw: 'Mtumiaji wa majaribio ameundwa kikamilifu! Sasa unaweza kufanya malipo.' },
  errorCreatingTestUser: { en: 'Error creating test user. Please try again.', sw: 'Hitilafu katika kuunda mtumiaji wa majaribio. Tafadhali jaribu tena.' },
  paymentInitiationFailed: { en: 'Payment initiation failed. Please try again.', sw: 'Kuanzisha malipo kumeshindwa. Tafadhali jaribu tena.' },
  
  // Home page content
  noMoviesAvailable: { en: 'No Movies Available', sw: 'Hakuna Filamu Zinazopatikana' },
  noSeriesAvailable: { en: 'No Series Available', sw: 'Hakuna Series Zilizongezwa' },
  noStoriesAvailable: { en: 'No Stories Available', sw: 'Hakuna Simulizi Zinazopatikana' },
  willBeAddedSoon: { en: 'They will be added soon', sw: 'Zitaongezwa hivi karibuni' },
  welcomeToRahaPremium: { en: 'Welcome to RahaPremium', sw: 'Karibu RahaPremium' },
  enjoyHighQualityContent: { en: 'Enjoy high-quality movies, series, and stories from East Africa', sw: 'Furahia filamu, mifululizo, na simulizi za hali ya juu kutoka Afrika Mashariki' },
  
  // Warnings and Messages
  subscriptionExpired: { en: 'Your subscription has expired', sw: 'Subscription yako imeisha' },
  pleaseSubscribe: { en: 'Please subscribe to access this content', sw: 'Tafadhali lipia ili kuona maudhui haya' },
  accountBlocked: { en: 'Your account has been blocked', sw: 'Akaunti yako imezuiliwa' },
  loginRequired: { en: 'Please log in to access content', sw: 'Tafadhali ingia ili kuona maudhui' },
  ageVerificationRequired: { en: 'Age verification required', sw: 'Uthibitisho wa umri unahitajika' },
  mustBe18: { en: 'You must be 18 years or older', sw: 'Lazima uwe na miaka 18 au zaidi' },
  invalidCredentials: { en: 'Invalid credentials', sw: 'Taarifa za kuingia si sahihi' },
  usernameTaken: { en: 'Username already taken', sw: 'Jina la mtumiaji limetumika' },
  phoneNumberInvalid: { en: 'Invalid phone number', sw: 'Nambari ya simu si sahihi' },
  
  // Auth specific messages
  enterPhoneNumber: { en: 'Enter your phone number to continue', sw: 'Ingiza nambari ya simu ili kuendelea' },
  welcomeBack: { en: 'Welcome Back!', sw: 'Karibu Tena!' },
  enterUsername: { en: 'Enter your username to login', sw: 'Ingiza jina la mtumiaji ili kuingia' },
  createAccount: { en: 'Create Account', sw: 'Tengeneza Akaunti' },
  completeRegistration: { en: 'Complete your registration', sw: 'Kamilisha usajili wako' },
  adminLogin: { en: 'Admin Login', sw: 'Kuingia kwa Admini' },
  enterAdminCredentials: { en: 'Enter your admin credentials', sw: 'Ingiza taarifa za admini' },
  userLogin: { en: 'User Login', sw: 'Kuingia kwa Mtumiaji' },
  premiumEntertainment: { en: 'Premium Entertainment Platform', sw: 'Jukwaa la Burudani la Hali ya Juu' },
  continue: { en: 'Continue', sw: 'Endelea' },
  phoneFormat: { en: 'Format: 0612345678 or 0712345678', sw: 'Muundo: 0612345678 au 0712345678' },
  phoneNumberWarning: { en: 'Important: You cannot change your phone number after signing up unless you contact admin.', sw: 'Muhimu: Hutaweza kubadilisha nambari ya simu baada ya kujisajili isipokuwa ukimwita admini.' },
  enterFullName: { en: 'Enter your full name', sw: 'Ingiza jina lako kamili' },
  chooseUsername: { en: 'Choose a unique username', sw: 'Chagua jina la kipekee la mtumiaji' },
  usernameNote: { en: 'Username will be used for future logins. Choose carefully.', sw: 'Jina la mtumiaji litatumika kwa kuingia baadaye. Chagua kwa uangalifu.' },
  validPhoneNumber: { en: 'Please enter a valid Tanzanian phone number (06XXXXXXXX or 07XXXXXXXX)', sw: 'Tafadhali ingiza nambari sahihi ya simu ya Tanzania (06XXXXXXXX au 07XXXXXXXX)' },
  failedCheckPhone: { en: 'Failed to check phone number. Please try again.', sw: 'Imeshindwa kukagua nambari ya simu. Tafadhali jaribu tena.' },
  invalidUsernameLogin: { en: 'Invalid username. Please check and try again.', sw: 'Jina la mtumiaji si sahihi. Tafadhali kagua na ujaribu tena.' },
  accountBlockedContact: { en: 'Your account has been blocked. Please contact support.', sw: 'Akaunti yako imezuiliwa. Tafadhali wasiliana na msaada.' },
  loginFailedRetry: { en: 'Login failed. Please try again.', sw: 'Kuingia kumeshindwa. Tafadhali jaribu tena.' },
  enterName: { en: 'Please enter your name', sw: 'Tafadhali ingiza jina lako' },
  enterUsernameField: { en: 'Please enter a username', sw: 'Tafadhali ingiza jina la mtumiaji' },
  usernameMinLength: { en: 'Username must be at least 3 characters long', sw: 'Jina la mtumiaji lazima liwe na angalau herufi 3' },
  usernameAlreadyTaken: { en: 'Username already taken. Please choose another one.', sw: 'Jina la mtumiaji limetumika. Tafadhali chagua jingine.' },
  registrationFailed: { en: 'Registration failed. Please try again.', sw: 'Usajili umeshindwa. Tafadhali jaribu tena.' },
  adminNotFound: { en: 'Admin account not found.', sw: 'Akaunti ya admini haijapatikana.' },
  adminDeactivated: { en: 'Admin account has been deactivated.', sw: 'Akaunti ya admini imezimwa.' },
  adminLoginFailed: { en: 'Admin login failed. Please check your credentials.', sw: 'Kuingia kwa admini kumeshindwa. Tafadhali kagua taarifa zako.' },
  
  // Success Messages
  profileUpdated: { en: 'Profile updated successfully', sw: 'Wasifu umesasishwa kikamilifu' },
  subscriptionActivated: { en: 'Subscription activated', sw: 'Subscription yamewashwa' },
  paymentCompleted: { en: 'Payment completed successfully', sw: 'Malipo yamekamilika kikamilifu' },
  
  // Adult Content
  adultContentAccess: { en: 'Adult Content Access', sw: 'Ufikiaji wa Maudhui ya Watu Wazima' },
  ageVerified: { en: 'Age Verified', sw: 'Umri Umehakikiwa' },
  ageNotVerified: { en: 'Age Not Verified', sw: 'Umri Haijahakikiwa' },
  ageVerifiedMessage: { en: 'You have access to adult content', sw: 'Una ufikiaji wa maudhui ya watu wazima' },
  ageNotVerifiedMessage: { en: 'Verify your age to access adult content', sw: 'Hakikisha umri wako ili kufikia maudhui ya watu wazima' },
  verifyAge: { en: 'Verify Age', sw: 'Hakikisha Umri' },
  ageVerificationDescription: { en: 'You must be 18 years or older to access adult content. Please enter your birth date to verify your age.', sw: 'Lazima uwe na miaka 18 au zaidi ili kufikia maudhui ya watu wazima. Tafadhali ingiza tarehe ya kuzaliwa kwako ili kuhakikisha umri wako.' },
  birthDate: { en: 'Birth Date', sw: 'Tarehe ya Kuzaliwa' },
  enterBirthDate: { en: 'Please enter your birth date', sw: 'Tafadhali ingiza tarehe yako ya kuzaliwa' },
  mustBe18OrOlder: { en: 'You must be 18 years or older to access adult content', sw: 'Lazima uwe na miaka 18 au zaidi ili kufikia maudhui ya watu wazima' },
  ageVerificationFailed: { en: 'Failed to verify age. Please try again.', sw: 'Imeshindwa kuhakikisha umri. Tafadhali jaribu tena.' },
  ageRestrictedContent: { en: 'Age Restricted Content', sw: 'Maudhui ya Umri wa Kizuizi' },
  adultContentWarning: { en: 'This section contains adult content that may not be suitable for all audiences. You must be 18 years or older to access this content. By proceeding, you confirm that you are of legal age and wish to view adult content.', sw: 'Sehemu hii ina maudhui ya watu wazima ambayo inaweza kuwa haifai kwa hadhira zote. Lazima uwe na miaka 18 au zaidi ili kufikia maudhui haya. Kwa kuendelea, unathibitisha kuwa una umri wa kisheria na unataka kuona maudhui ya watu wazima.' },
  noAdultContentFound: { en: 'No Adult Content Found', sw: 'Hakuna Maudhui ya Watu Wazima Yamepatikana' },
  tryAdjustingSearch: { en: 'Try adjusting your search or filter criteria.', sw: 'Jaribu kurekebisha utafutaji au vigezo vya kuchuja.' },
  noAdultContentAvailable: { en: 'No adult content is currently available.', sw: 'Hakuna maudhui ya watu wazima yanayopatikana kwa sasa.' },
  
  // Adult Content Instructions
  unlockAdultContent: { en: 'Unlock Adult Content', sw: 'Fungua Maudhui ya Watu Wazima' },
  adultContentInstructions: { en: 'To access adult content, verify your age in your profile settings', sw: 'Ili kufikia maudhui ya watu wazima, hakikisha umri wako katika mipangilio ya wasifu wako' },
  howToAccessAdult: { en: 'How to Access Adult Content:', sw: 'Jinsi ya Kufikia Maudhui ya Watu Wazima:' },
  step1: { en: '1. Go to your Profile', sw: '1. Nenda kwenye Wasifu Wako' },
  step2: { en: '2. Find "Adult Content Access" section', sw: '2. Tafuta sehemu ya "Ufikiaji wa Maudhui ya Watu Wazima"' },
  step3: { en: '3. Click "Verify Age" and enter your birth date', sw: '3. Bonyeza "Hakikisha Umri" na ingiza tarehe yako ya kuzaliwa' },
  step4: { en: '4. Adult content will appear in navigation', sw: '4. Maudhui ya watu wazima yataonekana kwenye urambazaji' },
  goToProfile: { en: 'Go to Profile', sw: 'Nenda Wasifu' },
  adultContentNote: { en: 'Note: You must be 18+ years old to access adult content', sw: 'Kumbuka: Lazima uwe na miaka 18+ ili kufikia maudhui ya watu wazima' },
  
  // Theme/Appearance
  appearance: { en: 'Appearance', sw: 'Muonekano' },
  appearanceDescription: { en: 'Choose your preferred theme', sw: 'Chagua muonekano unapopendelea' },
  light: { en: 'Light', sw: 'Mwanga' },
  dark: { en: 'Dark', sw: 'Giza' },
  system: { en: 'System', sw: 'Mfumo' },
  systemDescription: { en: 'Follow system settings', sw: 'Fuata mipangilio ya mfumo' },
  
  // Search functionality
  searchPlaceholder: { en: 'Search for movies, series, and stories...', sw: 'Tafuta filamu, mifululizo, na simulizi...' },
  searchResults: { en: 'Search Results', sw: 'Matokeo ya Utafutaji' },
  noResultsFound: { en: 'No results found', sw: 'Hakuna matokeo yamepatikana' },
  tryDifferentSearch: { en: 'Try a different search term or browse different categories', sw: 'Jaribu neno lingine au angalia kategoria tofauti' },
  searching: { en: 'Searching...', sw: 'Inatafuta...' },
  resultsFound: { en: 'results found', sw: 'matokeo yamepatikana' },
  all: { en: 'All', sw: 'Zote' },
  browseByCategory: { en: 'Browse by Category', sw: 'Vinavyoangaziwa' },
  browseAllMovies: { en: 'Browse all movies', sw: 'Angalia filamu zote' },
  browseAllSeries: { en: 'Browse all series', sw: 'Angalia mifululizo yote' },
  browseAllStories: { en: 'Browse all stories', sw: 'Soma simulizi zote' },
  seasons: { en: 'seasons', sw: 'majira' },
  season: { en: 'season', sw: 'majira' },
  views: { en: 'views', sw: 'maoni' },
  rating: { en: 'Rating', sw: 'Rating' },
  author: { en: 'Author', sw: 'Mwandishi' },
  
  // Seasons Management
  manageSeasons: { en: 'Manage Season', sw: 'Simamia Majira' },
  addSeason: { en: 'Add Season', sw: 'Ongeza Msimu' },
  editSeason: { en: 'Edit Season', sw: 'Hariri Msimu' },
  deleteSeason: { en: 'Delete Season', sw: 'Futa Msimu' },
  seasonNumber: { en: 'Season Number', sw: 'Nambari ya Msimu' },
  seasonTitle: { en: 'Season Title', sw: 'Kichwa cha Msimu' },
  seasonDescription: { en: 'Season Description', sw: 'Maelezo ya Msimu' },
  addEpisode: { en: 'Add Episode', sw: 'Ongeza Kipindi' },
  editEpisode: { en: 'Edit Episode', sw: 'Hariri Kipindi' },
  deleteEpisode: { en: 'Delete Episode', sw: 'Futa Kipindi' },
  episode: { en: 'Episode', sw: 'Kipindi' },
  episodeNumber: { en: 'Episode Number', sw: 'Nambari ya Kipindi' },
  episodeTitle: { en: 'Episode Title', sw: 'Kichwa cha Kipindi' },
  episodeDescription: { en: 'Episode Description', sw: 'Maelezo ya Kipindi' },
  noSeasonsYet: { en: 'No seasons yet', sw: 'Hakuna majira bado' },
  noEpisodesYet: { en: 'No episodes yet', sw: 'Hakuna vipindi bado' },
  totalEpisodes: { en: 'episodes', sw: 'vipindi' },
  episodeDuration: { en: 'Duration (minutes)', sw: 'Muda (dakika)' },
  googleDriveUrl: { en: 'Google Drive URL', sw: 'Kiungo cha Google Drive' },
  thumbnailUrl: { en: 'Thumbnail URL', sw: 'Kiungo cha Picha' },
  videoQuality: { en: 'Video Quality', sw: 'Ubora wa Video' },
  
  // Navigation
  adultContent: { en: '+18 Adults', sw: '+18 Wakubwa' },
  adultContentShort: { en: '+18', sw: '+18' },
  matureContentForAdults: { en: 'Mature content for adults 18 years and older. Age verification required.', sw: 'Maudhui ya watu wazima wenye miaka 18 na zaidi. Uthibitisho wa umri unahitajika.' },
  
  // Games
  games: { en: 'Games', sw: 'Games' },
  game: { en: 'Game', sw: 'Games' },
  noGamesAvailable: { en: 'No Games Available', sw: 'Hakuna Michezo Inayopatikana' },
  gameDetails: { en: 'Game Details', sw: 'Maelezo ya Mchezo' },
  howToSet: { en: 'How to Set', sw: 'Jinsi ya Kuseti' },
  download: { en: 'Download', sw: 'Pakua' },
  downloadGame: { en: 'Download Game', sw: 'Pakua Mchezo' },
  gamePrice: { en: 'Price', sw: 'Bei' },
  gameDuration: { en: 'Access Duration', sw: 'Muda wa Ufikiaji' },
  daysAccess: { en: 'days access', sw: 'siku za ufikiaji' },
  payToDownload: { en: 'Pay to Download', sw: 'Lipa Ili Kupakua' },
  payAndDownload: { en: 'Pay & Download', sw: 'Lipia na Pakua' },
  gameAccessExpired: { en: 'Your access to this game has expired', sw: 'Ufikiaji wako wa mchezo huu umeisha' },
  gameAccessActive: { en: 'You have active access to this game', sw: 'Una ufikiaji hai wa mchezo huu' },
  accessExpiresOn: { en: 'Access expires on', sw: 'Ufikiaji unaisha tarehe' },
  renewAccess: { en: 'Renew Access', sw: 'Sasisha Ufikiaji' },
  watchTutorial: { en: 'Watch Tutorial', sw: 'Angalia Jinsi ya Kuseti' },
  downloadNow: { en: 'Download Now', sw: 'Pakua Sasa' },
  gameThumbnail: { en: 'Game Thumbnail', sw: 'Picha ya Mchezo' },
  howToSetVideo: { en: 'How to Set Video Link', sw: 'Video Jinsi ya Kuseti Game Lako' },
  downloadLink: { en: 'Download Link', sw: 'Kiungo cha Kupakua' },
  gameTitle: { en: 'Game Title', sw: 'Jina la Mchezo' },
  gameDescription: { en: 'Game Description', sw: 'Maelezo ya Mchezo' },
  accessDuration: { en: 'Access Duration (days)', sw: 'Muda wa Ufikiaji (siku)' },
  manageGames: { en: 'Manage Games', sw: 'Simamia Michezo' },
  addGame: { en: 'Add Game', sw: 'Ongeza Mchezo' },
  editGame: { en: 'Edit Game', sw: 'Hariri Mchezo' },
  deleteGame: { en: 'Delete Game', sw: 'Futa Mchezo' },
  gameManagement: { en: 'Game Management', sw: 'Usimamizi wa Michezo' },
  totalGames: { en: 'Total Games', sw: 'Jumla ya Michezo' },
  activeGames: { en: 'Active Games', sw: 'Michezo Hai' },
  inactiveGames: { en: 'Inactive Games', sw: 'Michezo Zisizo Hai' },
  gameNotFound: { en: 'Game not found', sw: 'Mchezo haujapatikana' },
  gameNotFoundMessage: { en: 'The game you\'re looking for doesn\'t exist or has been removed.', sw: 'Mchezo unayoutafuta haupo au umefutwa.' },
  paymentForGame: { en: 'Payment for Game', sw: 'Malipo ya Mchezo' },
  gamePaymentSuccess: { en: 'Payment successful! Your game access has been activated.', sw: 'Malipo yamefanikiwa! Ufikiaji wako wa mchezo umeamilishwa.' },
  gamePaymentFailed: { en: 'Payment failed. Please try again.', sw: 'Malipo yameshindwa. Tafadhali jaribu tena.' },
  gameAccessGranted: { en: 'Access granted! You can now download the game.', sw: 'Ufikiaji umetolewa! Sasa unaweza kupakua mchezo.' },
  gameAccessExpiringSoon: { en: 'Your game access is expiring soon', sw: 'Ufikiaji wako wa mchezo unaisha hivi karibuni' },
  
  // Game payment and access messages
  requiredSubscription: { en: 'Required Subscription:', sw: 'Subscription Inayohitajika:' },
  checkingAccess: { en: 'Checking access...', sw: 'Inakaguliwa ufikiaji...' },
  youHaveAccessToThisGame: { en: 'You have access to this game', sw: 'Una ufikiaji wa mchezo huu' },
  paymentRequired: { en: 'Payment Required', sw: 'Malipo Yanahitajika' },
  gameRequiresOneTimePayment: { 
    en: 'This game requires a one-time payment from the packages listed below', 
    sw: 'Mchezo huu unahitaji malipo ya mara moja kutoka kwenye vifurushi vilivyo hapa chini' 
  },
  requiredSubscriptionType: { en: 'Required subscription type:', sw: 'Aina ya subscription inayohitajika:' },
  payForThisGame: { en: 'Pay for This Game', sw: 'Lipia Hili Gemu' },
  payForGame: { en: 'Pay for Game', sw: 'Lipia Gemu' },
  gameLabel: { en: 'Game:', sw: 'Gemu:' },
  free: { en: 'Free', sw: 'Bure' },
  freeGame: { en: 'Free Game', sw: 'Mchezo Bure' },
  gameMode: { en: 'Game Mode', sw: 'Aina ya Mchezo' },
  mod: { en: 'Mod', sw: 'Mod' },
  premium: { en: 'Premium', sw: 'Premium' },
  maleo: { en: 'Maleo', sw: 'Maleo' },
  'maleo bus mod': { en: 'Maleo Bus Mod', sw: 'Maleo Bus Mod' },
  'maleo map mod': { en: 'Maleo Map Mod', sw: 'Maleo Map Mod' },
  'ets2 bus mod': { en: 'ETS2 Bus Mod', sw: 'ETS2 Bus Mod' },
  original: { en: 'Original', sw: 'Original' },
  other: { en: 'Other', sw: 'Nyingine' },
  amountLabel: { en: 'Amount:', sw: 'Kiasi:' },
  processing: { en: 'Processing...', sw: 'Inachakatwa...' },
  paymentStatusLabel: { en: 'Payment Status:', sw: 'Hali ya Malipo:' },
  waitingForPayment: { en: 'Waiting for payment...', sw: 'Inasubiri malipo...' },
  ussdCodeLabel: { en: 'USSD Code:', sw: 'Nambari ya USSD:' },
  checkPaymentStatus: { en: 'Check Payment Status', sw: 'Kagua Hali ya Malipo' },
  unableToLoadDownloadPage: { en: 'Unable to Load Download Page', sw: 'Haikuweza Kupakia Ukurasa wa Kupakua' },
  downloadLinkCannotBeDisplayed: { en: 'This download link cannot be displayed in the app. Click the button below to open it in a new tab.', sw: 'Kiungo hiki cha kupakua hakiwezi kuonyeshwa kwenye programu. Bofya kitufe hapa chini ili kukifungua kwenye tabo mpya.' },
  openDownloadLink: { en: 'Open Download Link', sw: 'Fungua Kiungo cha Kupakua' },
  loadingDownloadPage: { en: 'Loading download page...', sw: 'Inapakia ukurasa wa kupakua...' },
  openInNewTab: { en: 'Open in New Tab', sw: 'Fungua kwenye Tabo Mpya' },
  
  // Search placeholders
  searchAdultContent: { en: 'Search adult content...', sw: 'Tafuta maudhui ya watu wazima...' },
  searchContent: { en: 'Search content...', sw: 'Tafuta maudhui...' },
  searchSeries: { en: 'Search series...', sw: 'Tafuta series...' },
  
  // Common messages
  linkCopiedToClipboard: { en: 'Link copied to clipboard!', sw: 'Kiungo kimeigwa kwenye clipboard!' },
  pleaseLogInFirst: { en: 'Please log in first to make a payment. You will be redirected to the login page.', sw: 'Tafadhali ingia kwanza ili kufanya malipo. Utaelekezwa kwenye ukurasa wa kuingia.' },
  supportedPaymentMethods: { en: 'Supported Payment Methods', sw: 'Njia za Malipo Zinazosaidiwa' },
  phoneNumberLabel: { en: 'Phone Number:', sw: 'Nambari ya Simu:' },
  testUserDetails: { en: 'Test User Details:', sw: 'Maelezo ya Mtumiaji wa Jaribio:' },
  manuallyCompletedByAdmin: { en: 'Manually completed by admin', sw: 'Imekamilika kwa mikono na admini' },
  
  // All Genres
  allGenres: { en: 'All Genres', sw: 'Aina Zote' },
  
  // Subscription required
  subscriptionRequired: { en: 'Subscription Required', sw: 'Subscription Inahitajika' },
  
  // Feedback Section
  communityFeedback: { en: 'Community Feedback', sw: 'Maoni ya Jamii' },
  shareYourThoughts: { en: 'Share your thoughts and ideas', sw: 'Shiriki mawazo na maoni yako' },
  writeYourFeedback: { en: 'Write your feedback...', sw: 'Andika maoni yako...' },
  loginToComment: { en: 'Login to comment', sw: 'Ingia ili kutoa maoni' },
  post: { en: 'Post', sw: 'Tuma' },
  reply: { en: 'Reply', sw: 'Jibu' },
  replies: { en: 'Replies', sw: 'Majibu' },
  edited: { en: '(edited)', sw: '(imehaririwa)' },
  justNow: { en: 'Just now', sw: 'Sasa hivi' },
  minutesAgo: { en: 'm ago', sw: ' dakika zilizopita' },
  hoursAgo: { en: 'h ago', sw: ' masaa yaliyopita' },
  daysAgo: { en: 'd ago', sw: ' siku zilizopita' },
  noFeedbackYet: { en: 'No feedback yet. Be the first to share!', sw: 'Hakuna maoni bado. Kuwa wa kwanza kushiriki!' },
  writeReply: { en: 'Write a reply...', sw: 'Andika jibu...' },
  feedbackSectionDisabled: { en: 'Feedback Section Disabled', sw: 'Sehemu ya Maoni Imezimwa' },
  feedbackDisabledMessage: { en: 'The feedback and comment section is currently disabled. Please check back later or contact support if you have any questions.', sw: 'Sehemu ya maoni na maoni imezimwa kwa sasa. Tafadhali rudi baadaye au wasiliana na msaada ikiwa una maswali yoyote.' },
  newFeedbackDisabled: { en: 'Adding new feedback is currently disabled by admin', sw: 'Kuongeza maoni mapya kumezimwa kwa sasa na admini' },
  viewExistingComments: { en: 'You can view existing comments below', sw: 'Unaweza kuona maoni yaliyopo hapa chini' },
  loadingFeedback: { en: 'Loading feedback...', sw: 'Inapakia maoni...' },
  failedToSubmitComment: { en: 'Failed to submit comment. Please try again.', sw: 'Kushindwa kutuma maoni. Tafadhali jaribu tena.' },
  failedToSubmitReply: { en: 'Failed to submit reply. Please try again.', sw: 'Kushindwa kutuma jibu. Tafadhali jaribu tena.' },
  failedToEditComment: { en: 'Failed to edit comment. Please try again.', sw: 'Kushindwa kuhariri maoni. Tafadhali jaribu tena.' },
  failedToEditReply: { en: 'Failed to edit reply. Please try again.', sw: 'Kushindwa kuhariri jibu. Tafadhali jaribu tena.' },
  
  // Live TV
  watchLiveStreamingChannels: { en: 'Watch live streaming channels', sw: 'Tazama chanel zote live' },
  searchChannels: { en: 'Search channels...', sw: 'Tafuta channel' },
  allChannels: { en: 'All Channels', sw: 'Channeli zote' },
  underMaintenance: { en: 'Under Maintenance', sw: 'Ipo kwenye matengenezo' },
  maintenance: { en: 'MAINTENANCE', sw: 'MATENGENEZO' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>('sw'); // Default to Swahili

  useEffect(() => {
    // Load saved language preference from localStorage
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'sw')) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    const translation = translations[key as keyof typeof translations];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  const value: LanguageContextType = {
    language,
    setLanguage: handleSetLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
