export const validateName = (name: string): string => {
    if (!name.trim()) return 'Name is required.';
    if (name.length < 3) return 'Name must be at least 3 characters.';
    return '';
  };
export const validateEmail = (email: string): string => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) return 'Email is required.';
    if (!emailRegex.test(email)) return 'Please enter a valid email.';
    return '';
  };
  
  export const validatePassword = (password: string): string => {
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  };
  
  export const validateConfirmPassword = (password: string, confirmPassword: string): string => {
    if (!confirmPassword.trim()) return 'Please confirm your password.';
    if (confirmPassword !== password) return 'Passwords do not match.';
    return '';
  };
  
  