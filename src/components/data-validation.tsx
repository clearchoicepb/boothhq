'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ValidationRule {
  id: string
  name: string
  description: string
  type: 'required' | 'format' | 'range' | 'unique' | 'custom'
  field: string
  config: Record<string, any>
  enabled: boolean
}

interface ValidationResult {
  ruleId: string
  ruleName: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  recordId?: string
  recordName?: string
}

interface DataValidationProps {
  recordType: 'leads' | 'contacts' | 'accounts' | 'opportunities'
  onValidationComplete?: (results: ValidationResult[]) => void
}

export function DataValidation({ recordType, onValidationComplete }: DataValidationProps) {
  const [rules, setRules] = useState<ValidationRule[]>([])
  const [results, setResults] = useState<ValidationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    loadDefaultRules()
  }, [recordType])

  const loadDefaultRules = () => {
    const defaultRules: ValidationRule[] = [
      {
        id: 'email-format',
        name: 'Email Format Validation',
        description: 'Ensures email addresses are in valid format',
        type: 'format',
        field: 'email',
        config: {
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        enabled: true
      },
      {
        id: 'phone-format',
        name: 'Phone Format Validation',
        description: 'Validates phone number format',
        type: 'format',
        field: 'phone',
        config: {
          pattern: '^[\\+]?[1-9][\\d]{0,15}$'
        },
        enabled: true
      },
      {
        id: 'required-fields',
        name: 'Required Fields Check',
        description: 'Ensures all required fields are filled',
        type: 'required',
        field: 'all',
        config: {
          requiredFields: recordType === 'leads' ? ['first_name', 'last_name'] :
                         recordType === 'contacts' ? ['first_name', 'last_name'] :
                         recordType === 'accounts' ? ['name'] :
                         ['name', 'amount']
        },
        enabled: true
      },
      {
        id: 'amount-range',
        name: 'Amount Range Validation',
        description: 'Validates opportunity amounts are positive',
        type: 'range',
        field: 'amount',
        config: {
          min: 0,
          max: 1000000
        },
        enabled: recordType === 'opportunities'
      }
    ]

    setRules(defaultRules)
  }

  const runValidation = async () => {
    setValidating(true)
    setResults([])

    try {
      // Fetch all records of the specified type
      const response = await fetch(`/api/${recordType}`)
      if (!response.ok) throw new Error('Failed to fetch records')
      
      const records = await response.json()
      
      const validationResults: ValidationResult[] = []

      // Run each enabled rule
      for (const rule of rules.filter(r => r.enabled)) {
        for (const record of records) {
          const result = validateRecord(record, rule)
          if (result) {
            validationResults.push(result)
          }
        }
      }

      setResults(validationResults)
      if (onValidationComplete) {
        onValidationComplete(validationResults)
      }
    } catch (error) {
      console.error('Validation error:', error)
    } finally {
      setValidating(false)
    }
  }

  const validateRecord = (record: any, rule: ValidationRule): ValidationResult | null => {
    const fieldValue = record[rule.field]
    const recordName = record.name || `${record.first_name} ${record.last_name}` || record.id

    switch (rule.type) {
      case 'required':
        const requiredFields = rule.config.requiredFields || [rule.field]
        const missingFields = requiredFields.filter((field: string) => !record[field] || record[field].toString().trim() === '')
        
        if (missingFields.length > 0) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            status: 'fail',
            message: `Missing required fields: ${missingFields.join(', ')}`,
            recordId: record.id,
            recordName
          }
        }
        break

      case 'format':
        if (fieldValue && typeof fieldValue === 'string') {
          const pattern = new RegExp(rule.config.pattern)
          if (!pattern.test(fieldValue)) {
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              status: 'fail',
              message: `Invalid ${rule.field} format: ${fieldValue}`,
              recordId: record.id,
              recordName
            }
          }
        }
        break

      case 'range':
        if (fieldValue !== null && fieldValue !== undefined) {
          const numValue = parseFloat(fieldValue)
          if (isNaN(numValue)) {
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              status: 'fail',
              message: `${rule.field} must be a valid number`,
              recordId: record.id,
              recordName
            }
          }

          if (rule.config.min !== undefined && numValue < rule.config.min) {
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              status: 'fail',
              message: `${rule.field} must be at least ${rule.config.min}`,
              recordId: record.id,
              recordName
            }
          }

          if (rule.config.max !== undefined && numValue > rule.config.max) {
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              status: 'warning',
              message: `${rule.field} is unusually high: ${fieldValue}`,
              recordId: record.id,
              recordName
            }
          }
        }
        break

      case 'unique':
        // This would require checking against all other records
        // For now, we'll skip this validation
        break
    }

    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-200'
      case 'fail':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getSummaryStats = () => {
    const total = results.length
    const passed = results.filter(r => r.status === 'pass').length
    const failed = results.filter(r => r.status === 'fail').length
    const warnings = results.filter(r => r.status === 'warning').length

    return { total, passed, failed, warnings }
  }

  const stats = getSummaryStats()

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Data Validation</h3>
          <p className="text-sm text-gray-600 mt-1">
            Validate data quality for {recordType}
          </p>
        </div>
        <Button
          onClick={runValidation}
          disabled={validating}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {validating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Run Validation
            </>
          )}
        </Button>
      </div>

      {/* Validation Rules */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Active Validation Rules</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rules.filter(r => r.enabled).map((rule) => (
            <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                <p className="text-xs text-gray-600">{rule.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  rule.type === 'required' ? 'bg-red-100 text-red-800' :
                  rule.type === 'format' ? 'bg-blue-100 text-blue-800' :
                  rule.type === 'range' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {rule.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Validation Results */}
      {results.length > 0 && (
        <div>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Issues</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Validation Results</h4>
            {results.map((result, index) => (
              <div key={index} className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}>
                <div className="flex items-start space-x-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{result.ruleName}</p>
                      <span className="text-sm text-gray-600">{result.recordName}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{result.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !validating && (
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Validation Results</h3>
          <p className="text-gray-600 mb-4">
            Click "Run Validation" to check your data quality.
          </p>
        </div>
      )}
    </div>
  )
}






