import { Response } from 'express'
import { AuthRequest, ApiResponse, AppError } from '../utils/types'
import prisma from '../config/prisma'
import {
  calculateDailyKPI,
  calculateWeeklyKPI,
  calculateMonthlyKPI,
  saveKPI,
} from '../services/kpi-engine'

export const getDailyKPI = async (req: AuthRequest, res: Response) => {
  const { date } = req.query

  if (!date) {
    throw new AppError('Parameter date harus diberikan (format: YYYY-MM-DD)', 400)
  }

  const dateObj = new Date(date as string)
  if (isNaN(dateObj.getTime())) {
    throw new AppError('Format date invalid', 400)
  }

  // Try to get from database first
  let kpi = await prisma.dailyKPI.findUnique({
    where: { date: dateObj },
  })

  if (!kpi) {
    // Calculate if not found
    const calculated = await calculateDailyKPI({ date: dateObj })
    res.json({
      success: true,
      message: 'Daily KPI berhasil dihitung',
      data: calculated,
      cached: false,
    } as ApiResponse<any>)
  } else {
    res.json({
      success: true,
      message: 'Daily KPI berhasil diambil',
      data: kpi,
      cached: true,
    } as ApiResponse<any>)
  }
}

export const calculateAndSaveDailyKPI = async (
  req: AuthRequest,
  res: Response
) => {
  const { date } = req.body

  if (!date) {
    throw new AppError('Parameter date harus diberikan', 400)
  }

  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    throw new AppError('Format date invalid', 400)
  }

  const calculated = await calculateDailyKPI({ date: dateObj })
  const saved = await saveKPI('daily', calculated, req.user!.id)

  res.json({
    success: true,
    message: 'Daily KPI berhasil dihitung dan disimpan',
    data: saved,
  } as ApiResponse<any>)
}

export const getWeeklyKPI = async (req: AuthRequest, res: Response) => {
  const { startDate } = req.query

  if (!startDate) {
    throw new AppError('Parameter startDate harus diberikan (format: YYYY-MM-DD)', 400)
  }

  const startDateObj = new Date(startDate as string)
  if (isNaN(startDateObj.getTime())) {
    throw new AppError('Format startDate invalid', 400)
  }

  // Try to get from database first
  let kpi = await prisma.weeklyKPI.findUnique({
    where: { startDate: startDateObj },
  })

  if (!kpi) {
    // Calculate if not found
    const calculated = await calculateWeeklyKPI(startDateObj)
    res.json({
      success: true,
      message: 'Weekly KPI berhasil dihitung',
      data: calculated,
      cached: false,
    } as ApiResponse<any>)
  } else {
    res.json({
      success: true,
      message: 'Weekly KPI berhasil diambil',
      data: kpi,
      cached: true,
    } as ApiResponse<any>)
  }
}

export const calculateAndSaveWeeklyKPI = async (
  req: AuthRequest,
  res: Response
) => {
  const { startDate } = req.body

  if (!startDate) {
    throw new AppError('Parameter startDate harus diberikan', 400)
  }

  const startDateObj = new Date(startDate)
  if (isNaN(startDateObj.getTime())) {
    throw new AppError('Format startDate invalid', 400)
  }

  const calculated = await calculateWeeklyKPI(startDateObj)
  const saved = await saveKPI('weekly', calculated, req.user!.id)

  res.json({
    success: true,
    message: 'Weekly KPI berhasil dihitung dan disimpan',
    data: saved,
  } as ApiResponse<any>)
}

export const getMonthlyKPI = async (req: AuthRequest, res: Response) => {
  const { year, month } = req.query

  if (!year || !month) {
    throw new AppError('Parameter year dan month harus diberikan', 400)
  }

  const yearNum = parseInt(year as string)
  const monthNum = parseInt(month as string)

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new AppError('Format year atau month invalid', 400)
  }

  const yearMonthKey = `${yearNum}-${String(monthNum).padStart(2, '0')}`

  // Try to get from database first
  let kpi = await prisma.monthlyKPI.findUnique({
    where: { yearMonth: yearMonthKey },
  })

  if (!kpi) {
    // Calculate if not found
    const calculated = await calculateMonthlyKPI(yearNum, monthNum)
    res.json({
      success: true,
      message: 'Monthly KPI berhasil dihitung',
      data: calculated,
      cached: false,
    } as ApiResponse<any>)
  } else {
    res.json({
      success: true,
      message: 'Monthly KPI berhasil diambil',
      data: kpi,
      cached: true,
    } as ApiResponse<any>)
  }
}

export const calculateAndSaveMonthlyKPI = async (
  req: AuthRequest,
  res: Response
) => {
  const { year, month } = req.body

  if (!year || !month) {
    throw new AppError('Parameter year dan month harus diberikan', 400)
  }

  const yearNum = parseInt(year as string)
  const monthNum = parseInt(month as string)

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new AppError('Format year atau month invalid', 400)
  }

  const calculated = await calculateMonthlyKPI(yearNum, monthNum)
  const saved = await saveKPI('monthly', calculated, req.user!.id)

  res.json({
    success: true,
    message: 'Monthly KPI berhasil dihitung dan disimpan',
    data: saved,
  } as ApiResponse<any>)
}
