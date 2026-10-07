'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { validateCredentials } from '@/lib/auth/mock-auth'
import { createSession, isAuthenticated } from '@/lib/auth/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginForm>()

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/')
    }
  }, [router])

  const onSubmit = (data: LoginForm) => {
    const parsed = loginSchema.safeParse(data)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field === 'username' || field === 'password') {
          setError(field, { message: issue.message })
        }
      }
      return
    }

    if (!validateCredentials(parsed.data.username, parsed.data.password)) {
      setError('password', { message: '用户名或密码错误' })
      return
    }
    createSession()
    router.replace('/')
  }

  return (
    <div className="relative flex min-h-screen flex-col text-white">
      <Image
        src="/images/login-bg.jpg"
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[#0B1120]/75 lg:bg-gradient-to-r lg:from-[#0B1120]/90 lg:via-[#0B1120]/70 lg:to-[#0B1120]/40" />

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10 lg:items-end lg:pr-16">
        <div className="w-full max-w-sm rounded-lg border border-white/15 bg-white/5 p-8 backdrop-blur-md">
          <div className="mb-6 text-center">
            <p className="text-lg font-semibold tracking-wide text-white">Extech MPMS</p>
            <h1 className="mt-1 text-sm font-medium text-white/80">制造工艺管理系统</h1>
            <p className="mt-1 text-xs text-white/50">V11.0</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username" className="text-white/80">
                用户名
              </Label>
              <Input
                id="username"
                autoComplete="username"
                className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                {...register('username')}
              />
              {errors.username && (
                <p className="text-sm text-red-400">{errors.username.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-white/80">
                密码
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="mt-2 w-full">
              登录
            </Button>
          </form>
        </div>
      </div>

      <footer className="relative px-4 pb-6 text-center text-xs text-white/50">
        © 2026 北京艾克斯科技有限公司 版权所有
      </footer>
    </div>
  )
}
