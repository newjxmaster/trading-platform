import { useForm as useReactHookForm, UseFormProps, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema } from 'zod';

// ============================================
// useForm Hook with Zod Validation
// ============================================

export function useForm<TFieldValues extends FieldValues = FieldValues>(
  schema: ZodSchema<TFieldValues>,
  options?: Omit<UseFormProps<TFieldValues>, 'resolver'>
) {
  return useReactHookForm<TFieldValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    ...options,
  });
}

export default useForm;
