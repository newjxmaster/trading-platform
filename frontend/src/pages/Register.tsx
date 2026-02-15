import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from '@hooks/useForm';
import { useAuth } from '@hooks/useAuth';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Select } from '@components/ui/Select';
import { AuthLayout } from '@components/layout/Layout';
import { cn } from '@utils/helpers';
import { 
  TrendingUp, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowRight,
  CheckCircle2,
  Building2,
  UserCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================
// Registration Form Schema
// ============================================

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.enum(['investor', 'business_owner']),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

// ============================================
// Role Options
// ============================================

const roleOptions = [
  { value: 'investor', label: 'Investor - I want to invest in businesses' },
  { value: 'business_owner', label: 'Business Owner - I want to raise capital' },
];

// ============================================
// Registration Page Component
// ============================================

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm(registerSchema, {
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'investor',
      agreeToTerms: false,
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: data.role,
      });

      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to create account. Please try again.');
    }
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-secondary-900 mb-2">
            Create your account
          </h1>
          <p className="text-secondary-600">
            Join TradeFlow and start your investment journey
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step >= s
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-200 text-secondary-500'
                )}
              >
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    'w-12 h-0.5 mx-1',
                    step > s ? 'bg-primary-600' : 'bg-secondary-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Account Type */}
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                  Choose your account type
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label
                    className={cn(
                      'relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all',
                      selectedRole === 'investor'
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-secondary-200 hover:border-secondary-300'
                    )}
                  >
                    <input
                      type="radio"
                      value="investor"
                      className="sr-only"
                      {...register('role')}
                    />
                    <UserCircle className="w-10 h-10 text-primary-600 mb-2" />
                    <span className="font-medium text-secondary-900">Investor</span>
                    <span className="text-xs text-secondary-500 text-center mt-1">
                      Invest in businesses
                    </span>
                    {selectedRole === 'investor' && (
                      <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-primary-600" />
                    )}
                  </label>

                  <label
                    className={cn(
                      'relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all',
                      selectedRole === 'business_owner'
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-secondary-200 hover:border-secondary-300'
                    )}
                  >
                    <input
                      type="radio"
                      value="business_owner"
                      className="sr-only"
                      {...register('role')}
                    />
                    <Building2 className="w-10 h-10 text-primary-600 mb-2" />
                    <span className="font-medium text-secondary-900">Business Owner</span>
                    <span className="text-xs text-secondary-500 text-center mt-1">
                      Raise capital for your business
                    </span>
                    {selectedRole === 'business_owner' && (
                      <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-primary-600" />
                    )}
                  </label>
                </div>

                <Button
                  type="button"
                  fullWidth
                  size="lg"
                  onClick={nextStep}
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Continue
                </Button>
              </div>
            )}

            {/* Step 2: Personal Information */}
            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                  Personal Information
                </h2>

                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  leftIcon={<User className="w-5 h-5" />}
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  leftIcon={<Mail className="w-5 h-5" />}
                  error={errors.email?.message}
                  {...register('email')}
                />

                <Input
                  label="Phone Number (Optional)"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  leftIcon={<Phone className="w-5 h-5" />}
                  error={errors.phone?.message}
                  {...register('phone')}
                />

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={prevStep}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={nextStep}
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Password & Terms */}
            {step === 3 && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                  Create Password
                </h2>

                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    leftIcon={<Lock className="w-5 h-5" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-secondary-400 hover:text-secondary-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    }
                    error={errors.password?.message}
                    {...register('password')}
                  />
                </div>

                <div className="relative">
                  <Input
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    leftIcon={<Lock className="w-5 h-5" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-secondary-400 hover:text-secondary-600 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    }
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                  />
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 mt-0.5 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    {...register('agreeToTerms')}
                  />
                  <span className="text-sm text-secondary-600">
                    I agree to the{' '}
                    <Link to="/terms" className="text-primary-600 hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-primary-600 hover:underline">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.agreeToTerms && (
                  <p className="text-sm text-danger-600">{errors.agreeToTerms.message}</p>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={prevStep}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    isLoading={isLoading}
                    loadingText="Creating account..."
                  >
                    Create Account
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Sign In Link */}
        <p className="text-center mt-6 text-secondary-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Register;
