export function translateAuthError(error: any, isRtl: boolean): string {
  if (!error) return isRtl ? 'حدث خطأ غير معروف' : 'An unknown error occurred';
  
  const errorMessage = typeof error === 'string' ? error : error.message || '';
  
  if (errorMessage.includes('auth/invalid-credential')) {
    return isRtl 
      ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' 
      : 'Invalid email or password.';
  }
  
  if (errorMessage.includes('auth/user-not-found')) {
    return isRtl 
      ? 'لم يتم العثور على حساب بهذا البريد الإلكتروني.' 
      : 'No account found with this email.';
  }
  
  if (errorMessage.includes('auth/wrong-password')) {
    return isRtl 
      ? 'كلمة المرور غير صحيحة.' 
      : 'Incorrect password.';
  }
  
  if (errorMessage.includes('auth/email-already-in-use')) {
    return isRtl 
      ? 'البريد الإلكتروني مستخدم بالفعل في حساب آخر.' 
      : 'This email is already in use by another account.';
  }
  
  if (errorMessage.includes('auth/weak-password')) {
    return isRtl 
      ? 'كلمة المرور ضعيفة جداً. يرجى استخدام 6 أحرف على الأقل.' 
      : 'Password is too weak. Please use at least 6 characters.';
  }
  
  if (errorMessage.includes('auth/invalid-email')) {
    return isRtl 
      ? 'صيغة البريد الإلكتروني غير صحيحة.' 
      : 'Invalid email format.';
  }

  if (errorMessage.includes('auth/too-many-requests')) {
    return isRtl 
      ? 'تم حظر طلباتك مؤقتاً بسبب محاولات فاشلة كثيرة. حاول مجدداً لاحقاً.' 
      : 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
  }
  
  if (errorMessage.includes('auth/network-request-failed')) {
    return isRtl 
      ? 'فشل الاتصال بالشبكة. يرجى التحقق من الإنترنت لديك.' 
      : 'Network connection failed. Please check your internet connection.';
  }

  // Fallback for generic or unhandled errors.
  return isRtl 
    ? 'حدث خطأ أثناء المصادقة والتسجيل. حاول مرة أخرى.' 
    : 'An error occurred during authentication. Please try again.';
}
