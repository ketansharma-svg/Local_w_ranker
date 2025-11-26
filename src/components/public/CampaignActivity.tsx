"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Card,
  Table,
  Typography,
  DatePicker,
  Input,
  Button,
  Space,
  Skeleton,
  message,
  Modal,
  Form,
  Select,
  InputNumber,
  Row,
  Col,
  Tooltip,
} from "antd"
import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
} from "@ant-design/icons"
import dayjs from "dayjs"
import localeData from "dayjs/plugin/localeData"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import axios from "axios"
import Cookies from "js-cookie"
import { useProjectContext } from "@/src/redux/providers/ProjectContext"
import { BASE_URL_WR } from "@/src/util/api"

dayjs.extend(localeData)

const { Text } = Typography
const { confirm } = Modal

interface CampaignActivityProps {
  loading?: boolean
  project_id: any
  isSharedProject?: boolean
  accessType?: string
}

interface ActivityRecord {
  id: string
  category: string
  activity: string
  status: string
   date: string // raw date from API
  formattedDueDate: string 
    createdDate: string 
  timeHours: number
  timeMinutes: number
  notes: string
  progress: string
  campaign_name?: string
  activity_name?: string
  category_name?: string
  last_updated_by?: {
    id: number
    username: string
    email: string
  } | null
  updated_at?: string | null
  formattedCompletedDate?: string | null
}

interface EditFormData {
  status: string
  date: string
  timeHours: number
  timeMinutes: number
  notes: string
  progress: string
}

const STATUS_CHOICES = [
  { value: "Not Started", label: "Not Started" },
  { value: "Working", label: "Working" },
  { value: "Completed", label: "Completed" },
]

const CampaignActivity: React.FC<CampaignActivityProps> = ({
  loading: propLoading = false,
  project_id,
  isSharedProject = false,
  accessType = "edit",
}) => {
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs | null>()
  const [apiData, setApiData] = useState<ActivityRecord[]>([])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ActivityRecord | null>(null)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [form] = Form.useForm()
  const router = useRouter()
  const { projects, sharedProjects } = useProjectContext();
  const pathname = usePathname()

  const getDomainAndProjectType = () => {

    const sharedProject = sharedProjects.find((sp: any) => sp.project?.id === Number(project_id))
    if (sharedProject) {
      return {
        domain: sharedProject.project?.domain,
        isSharedProject: true,
      }
    }


    const regularProject = projects.find((project: any) => project.id === Number(project_id))
    if (regularProject) {
      return {
        domain: regularProject.domain,
        isSharedProject: false,
      }
    }

    return {
      domain: null,
      isSharedProject: false,
    }
  }

  const { domain } = getDomainAndProjectType()


const fetchCampaignActivities = async () => {
  setLoading(true);
  setError(null);
  const isProjectDetailsPage = pathname.includes("project-details");

  const access_token = Cookies.get("login_access_token_wrank");

  const endpoint = isProjectDetailsPage
    ? `${BASE_URL_WR}published-activities/${project_id}`
    : `${BASE_URL_WR}campaign-activities/?project_id=${project_id}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (!isProjectDetailsPage && access_token) {
    headers["Authorization"] = `Bearer ${access_token}`;
  }

  try {
    const response = await fetch(endpoint, { headers });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const transformedData: ActivityRecord[] = [];

      result.categories?.forEach((categoryGroup: any) => {
        categoryGroup.activities?.forEach((item: any) => {
          
          if (item.is_published === true) {
            transformedData.push({
              id: item.id?.toString() || Math.random().toString(),
              category: categoryGroup.category_name || "N/A",
              activity: item.title || "N/A",
              status: item.status || "Not Started",
              date: item.date
                ? dayjs(item.date).format("DD MMM YYYY")
                : "-",
              formattedDueDate: item.due_date
                  ? dayjs(item.due_date).format("DD MMM YYYY")
                  : "-",
              formattedCompletedDate: item.completed_at
                  ? dayjs(item.completed_at).format("DD MMM YYYY")
                  : "-",
                createdDate: dayjs(item.created_at).format("DD MMM YYYY"),
              timeHours: item.time_spent_hours || 0,
              timeMinutes: item.time_spent_minutes || 0,
              notes: item.notes || "",
              progress:
                item.progress === "#" || !item.progress ? "" : item.progress,
              campaign_name: "seo analysis",
              activity_name: item.title || "N/A",
              category_name: categoryGroup.category_name || "seo",
              last_updated_by: item.last_updated_by
                ? {
                    id: item.last_updated_by.id,
                    username: item.last_updated_by.username,
                    email: item.last_updated_by.email,
                  }
                : null,
              updated_at: item.updated_at || null,
            });
          }
        });
      });

    setApiData(transformedData);
  } catch (err) {
    console.error("Error fetching campaign activities:", err);
    setError(err instanceof Error ? err.message : "Failed to fetch data");
    setApiData([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchCampaignActivities()
  }, [project_id])

  const getFilteredActivities = () => {
  if (!selectedMonth) return apiData;
  
  const startOfMonth = selectedMonth.startOf('month');
  const endOfMonth = selectedMonth.endOf('month');
  
  return apiData.filter(activity => {
    if (!activity.updated_at) return false;
    const activityDate = dayjs(activity.updated_at);
    return activityDate.isAfter(startOfMonth) && activityDate.isBefore(endOfMonth);
  });
};

  const handleEdit = (record: ActivityRecord) => {
    setEditingRecord(record)
    form.setFieldsValue({
      status: record.status,
      date: dayjs(record.date, "DD MMM YYYY"),
      timeHours: record.timeHours,
      timeMinutes: record.timeMinutes,
      notes: record.notes,
      progress: record.progress,
    })
    setEditModalVisible(true)
  }

  const handleUpdate = async (values: EditFormData) => {
    if (!editingRecord) return
    const access_token = Cookies.get("login_access_token_wrank")

    confirm({
      title: "Confirm Update",
      icon: <ExclamationCircleOutlined />,
      content: "Are you sure you want to update this activity?",
      okText: "Yes, Update",
      cancelText: "Cancel",
      onOk: async () => {
        setUpdateLoading(true)
        try {
          const updateData = {
            // Keep these fields unchanged
            campaign_name: editingRecord.campaign_name || "seo analysys",
            activity_name: editingRecord.activity_name || "checking title meta",
            category_name: editingRecord.category_name || "seo",
            // Update these fields
            id: editingRecord.id,
            status: values.status,
            date: dayjs(values.date).format("YYYY-MM-DD"),
            time_spent_hours: values.timeHours,
            time_spent_minutes: values.timeMinutes,
            notes: values.notes,
            progress: values.progress,
          }

          const response = await fetch(`${BASE_URL_WR}campaign-activities/${editingRecord.id}/`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              'Authorization': `Bearer ${access_token}`,
            },
            body: JSON.stringify(updateData),
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

           const updatedRecord = await response.json()

          // Update the local state
          setApiData((prevData) =>
            prevData.map((item) =>
              item.id === editingRecord.id
                ? {
                    ...item,
                    status: values.status,
                    date: dayjs(values.date).format("DD MMM YYYY"),
                    timeHours: values.timeHours,
                    timeMinutes: values.timeMinutes,
                    notes: values.notes,
                    progress: values.progress,
                     last_updated_by: updatedRecord.last_updated_by,
                    updated_at: updatedRecord.updated_at,
                  }
                : item,
            ),
          )

          setEditingRecord((prev) =>
            prev
              ? {
                  ...prev,
                  status: values.status,
                  date: dayjs(values.date).format("DD MMM YYYY"),
                  timeHours: values.timeHours,
                  timeMinutes: values.timeMinutes,
                  notes: values.notes,
                  progress: values.progress,
                  last_updated_by: updatedRecord.last_updated_by,
                  updated_at: updatedRecord.updated_at,
                }
              : null,
          )


          message.success("Activity updated successfully!")
          setEditModalVisible(false)
          setEditingRecord(null)
          form.resetFields()
        } catch (err) {
          console.error("Error updating activity:", err)
          message.error("Failed to update activity. Please try again.")
        } finally {
          setUpdateLoading(false)
        }
      },
    })
  }

  const handleDelete = (record: ActivityRecord) => {
    Modal.confirm({
      title: "Are you sure you want to delete this activity?",
      content: "This action cannot be undone.",
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await axios.delete(`${BASE_URL_WR}campaign-activities/${record.id}/`)
          message.success("Activity deleted successfully")
          fetchCampaignActivities() // refresh the list
        } catch (error: any) {
          console.error("Delete failed:", error)
          message.error(error.response.data.message)
        }
      },
    })
  }

  const handleModalCancel = () => {
    setEditModalVisible(false)
    setEditingRecord(null)
    form.resetFields()
  }

  const isLoading = propLoading || loading

  // Determine what actions to show based on access type
  const getActionButtons = (record: ActivityRecord) => {
    if (isSharedProject) {
      if (accessType === "view") {
        // View only - no action buttons
        return (
          <Tooltip title="View only access - no actions available">
            <Button icon={<EyeOutlined />} shape="circle" disabled />
          </Tooltip>
        )
      } else if (accessType === "edit") {
        // Edit only - show edit button only
        return (
          <Space>
            <Tooltip title="Edit activity">
              <Button icon={<EditOutlined />} shape="circle"  onClick={() => handleEdit(record)} type="default" />
            </Tooltip>
          </Space>
        )
      }
    }

    // Personal project or full access - show both buttons
    return (
      <Space>
        <Tooltip title="Edit activity">
          <Button icon={<EditOutlined />} shape="circle"  onClick={() => handleEdit(record)} type="default" />
        </Tooltip>
        <Tooltip title="Delete activity">
          <Button icon={<DeleteOutlined />} shape="circle" color="danger" onClick={() => handleDelete(record)} type="default" />
        </Tooltip>
      </Space>
    )
  }

  const getCompletionTimingStatus = (record: ActivityRecord) => {
    if (!record.formattedDueDate || !record.formattedCompletedDate) {
      return { color: "#525252", message: "Timing unavailable" }
    }

    const dueDate = dayjs(record.formattedDueDate, "DD MMM YYYY")
    const completedDate = dayjs(record.formattedCompletedDate, "DD MMM YYYY")

    if (!dueDate.isValid() || !completedDate.isValid()) {
      return { color: "#525252", message: "Timing unavailable" }
    }

    const diffDays = Math.abs(dueDate.diff(completedDate, "day"))
    const withDays = diffDays ? ` (${diffDays}d)` : ""

    if (completedDate.isBefore(dueDate, "day")) {
      return { color: "#15803d", message: `Finished early${withDays}` }
    }

    if (completedDate.isSame(dueDate, "day")) {
      return { color: "#2563eb", message: "Finished on time" }
    }

    return { color: "#dc2626", message: `Finished late${withDays}` }
  }

  const columns = [
    {
      title: "Category Name",
      dataIndex: "category",
      key: "category",
      width: 150,
      render: (text: string) => <Input value={text} bordered className="rounded-md p-2" readOnly />,
    },
    {
      title: "Activity",
      dataIndex: "activity",
      key: "activity",
      width: 180,
      render: (text: string) => <Input value={text} bordered className="rounded-md p-2" readOnly />,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (text: string) => <Input value={text} bordered className="rounded-md p-2" readOnly />,
    },
    {
      title: "Progress",
      key: "progress",
      width: 100,
      render: (_: any, record: ActivityRecord) =>
        record.progress ? (
          <a href={record.progress} target="_blank" rel="noopener noreferrer" className="text-purple font-medium">
            Go to link
          </a>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      title: "Created At",
      dataIndex: "createdDate",
      key: "createdDate",
      width: 130,
      render: (text: string) => <Input value={text} bordered className="rounded-md p-2" readOnly />,
    },
    {
      title: "Due Date",
      dataIndex: "formattedDueDate",
      key: "duedate",
      width: 130,
      render: (text: string) => <Input value={text} bordered className="rounded-md p-2" readOnly />,
    },
    {
      title: "Completed Date",
      dataIndex: "formattedCompletedDate",
      key: "duedate",
      width: 130,
      render: (text: string) => <Input value={text} bordered className="rounded-md p-2" readOnly />,
    },
    {
      title: "Completion Timing",
      key: "dueStatus",
      width: 150,
      render: (_: any, record: ActivityRecord) => {
        const { color, message } = getCompletionTimingStatus(record)
        return (
          <Text style={{ color, fontWeight: 500 }}>
            {message}
          </Text>
        )
      },
    },
    {
      title: "Time Spent",
      key: "timeSpent",
      width: 120,
      render: (_: any, record: ActivityRecord) => (
        <Space size={4}>
          <Input
            value={record.timeHours.toString().padStart(2, "0")}
            className="w-12 rounded-md p-2 text-center"
            readOnly
          />
          <Input
            value={record.timeMinutes.toString().padStart(2, "0")}
            className="w-12 rounded-md p-2 text-center"
            readOnly
          />
        </Space>
      ),
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      width: 200,
      render: (text: string) => <Input value={text} bordered className="rounded-md p-2" readOnly />,
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      // fixed: "right" as const,
      render: (_: any, record: ActivityRecord) => getActionButtons(record),
    },
  ]
const filteredActivities = getFilteredActivities();


  const totalMinutes = filteredActivities.reduce((acc, item) => acc + item.timeHours * 60 + item.timeMinutes, 0);
  const totalHours = Math.floor(totalMinutes / 60)
  const totalRemainingMinutes = totalMinutes % 60

  if (isLoading) {
    return (
      <Card title="Campaign Activity">
        <Skeleton active paragraph={{ rows: 10 }} />
      </Card>
    )
  }

  const handleClick = () => {
    window.open(`/custom-dashboard/create-activity/${project_id}`, "_blank")
  }

  // Check if user can add activities (only for personal projects or edit access)
  const canAddActivity = !isSharedProject

  return (
    <>
      <Card
        className="mt-4"
        title={
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center py-3 gap-2">
              <Image src="/images/new/campagin.png" height={30} width={30} alt="" />
              <span className="text-lg font-semibold">Campaign Activity</span>
              {isSharedProject && (
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    accessType === "view" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-600"
                  }`}
                >
                  {accessType === "view" ? "View Only" : "Edit Access"}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <DatePicker
                picker="month"
                value={selectedMonth}
                onChange={(date) => setSelectedMonth(date)}
                format="MMMM"
                allowClear={false}
                suffixIcon={<CalendarOutlined />}
                className={`rounded-full ${project_id === null ? "cursor-not-allowed opacity-50" : ""}`}
                disabled={project_id === null}
                disabledDate={(current) => {
    // Disable dates that are after today
    return current && current > dayjs().endOf('day');
  }}
              />
              
              <Button
                type="primary"
                onClick={() => setSelectedMonth(null)}
                disabled={!selectedMonth}
                className={`rounded-full ${
                  !selectedMonth ? "cursor-not-allowed opacity-90" : ""
                }`} > Remove
              </Button>

              <Button
                icon={<PlusOutlined />}
                onClick={handleClick}
                disabled={project_id === null || !canAddActivity}
                type="primary"
                className={`rounded-full ${
                  project_id === null || !canAddActivity ? "cursor-not-allowed opacity-90" : ""
                }`}
              >
                Add Activity
              </Button>

              <Button
                icon={<UploadOutlined />}
                disabled={project_id === null || !canAddActivity}
                className={`rounded-full ${
                  project_id === null || !canAddActivity ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                CSV
              </Button>
            </div>
          </div>
        }
      >
        <div className="bg-lightblue rounded-md p-3 mb-3 flex justify-end text-lg items-center">
          <Text style={{ color: "#1677ff", fontWeight: 500 }}>
            Total Time: {totalHours.toString().padStart(2, "0")}:{totalRemainingMinutes.toString().padStart(2, "0")}{" "}
            hours
          </Text>
        </div>
        <div className="overflow-x-auto">
          <Table
            dataSource={getFilteredActivities()}
            columns={columns}
  pagination={{ pageSize: 5 }}
            rowKey="id"
            rowClassName={() => "hoverable-row"}
            bordered
            scroll={{ x: "max-content" }}
            size="middle"
          />
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <EditOutlined style={{ color: "#1677ff" }} />
            <span>Edit Activity</span>
          </div>
        }
        open={editModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate} className="mt-4">
          {/* Last Updated By Information */}
          {editingRecord?.last_updated_by && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <EditOutlined style={{ color: "#1677ff" }} />
                <Text strong style={{ color: "#1677ff" }}>
                  Last Updated Information
                </Text>
              </div>
              <Row gutter={16}>
                <Col span={8}>
                  <Text strong>Updated By:</Text>
                  <br />
                  <Text type="secondary">{editingRecord.last_updated_by.username}</Text>
                </Col>
                <Col span={8}>
                  <Text strong>Email:</Text>
                  <br />
                  <Text type="secondary">{editingRecord.last_updated_by.email}</Text>
                </Col>
                <Col span={8}>
                  <Text strong>Updated At:</Text>
                  <br />
                  <Text type="secondary">
                    {editingRecord.updated_at ? dayjs(editingRecord.updated_at).format("DD MMM YYYY, HH:mm") : "N/A"}
                  </Text>
                </Col>
              </Row>
            </div>
          )}

          {editingRecord && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <Row gutter={16}>
                <Col span={8}>
                  <Text strong>Campaign:</Text>
                  <br />
                  <Text type="secondary">{domain as any}</Text>
                </Col>
                <Col span={8}>
                  <Text strong>Activity:</Text>
                  <br />
                  <Text type="secondary">{editingRecord.activity_name}</Text>
                </Col>
                <Col span={8}>
                  <Text strong>Category:</Text>
                  <br />
                  <Text type="secondary">{editingRecord.category_name}</Text>
                </Col>
              </Row>
            </div>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Status" name="status" rules={[{ required: true, message: "Please select a status!" }]}>
                <Select placeholder="Select status" options={STATUS_CHOICES} size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Date" name="date" rules={[{ required: true, message: "Please select a date!" }]}>
                <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Time Spent (Hours)"
                name="timeHours"
                rules={[{ required: true, message: "Please enter hours!" }]}
              >
                <InputNumber min={0} max={23} style={{ width: "100%" }} size="large" placeholder="Hours" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Time Spent (Minutes)"
                name="timeMinutes"
                rules={[{ required: true, message: "Please enter minutes!" }]}
              >
                <InputNumber min={0} max={59} style={{ width: "100%" }} size="large" placeholder="Minutes" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Progress Link" name="progress">
            <Input placeholder="Enter progress link" size="large" />
          </Form.Item>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={4} placeholder="Enter notes (optional)" size="large" />
          </Form.Item>

          <Form.Item className="mb-0 mt-6">
            <Space className="w-full justify-end">
              <Button onClick={handleModalCancel} size="large">
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={updateLoading} size="large">
                Update Activity
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default CampaignActivity
