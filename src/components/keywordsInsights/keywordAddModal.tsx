"use client"

import type React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useProjectManager } from "@/src/hooks/use-project-manager"
import { BASE_URL_WR } from "@/src/util/api"
import axios from "axios"
import { AnimatePresence, motion } from "framer-motion"
import { Check, FileText, Link, Loader2, Monitor, Plus, Smartphone, Upload } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import Cookies from "js-cookie"
const token = Cookies.get("login_access_token_wrank")

interface LocationOption {
  id: number
  label: string 
  engine_id_desktop: number
  engine_id_mobile: number
}

const KeywordAddModal = ({ showAddModal, setShowAddModal, onAdd }: any) => {
  const [activeTab, setActiveTab] = useState("insights")
  const { selectedProject } = useProjectManager()

  const [isProcessing, setIsProcessing] = useState(false)
  const [modalStep, setModalStep] = useState(1)
  const [inputMethod, setInputMethod] = useState<"manual" | "csv" | "gsc">("manual")
  const [keywordInput, setKeywordInput] = useState("")
  const [parsedKeywords, setParsedKeywords] = useState<string[]>([])
  const [removeDuplicates, setRemoveDuplicates] = useState(true)
  const [removeStopWords, setRemoveStopWords] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState("unassigned")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedPriority, setSelectedPriority] = useState("medium")
  const [selectedDevice, setSelectedDevice] = useState("desktop")
  const [newTag, setNewTag] = useState("")
  const [open, setOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [fetching, setFetching] = useState(false)

  // ... existing modal functions remain the same ...
  const handleInputMethodChange = (method: "manual" | "csv" | "gsc") => {
    setInputMethod(method)
    setKeywordInput("")
    setParsedKeywords([])
  }
  const handleKeywordInputChange = (value: string) => {
    setKeywordInput(value)
    if (inputMethod === "manual") {
      const keywords = value.split("\n").filter((k) => k.trim().length > 0)
      setParsedKeywords(keywords)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const lines = text.split("\n")
        const keywords = lines
          .slice(1)
          .map((line) => line.split(",")[0])
          .filter((k) => k.trim().length > 0)
        setParsedKeywords(keywords)
        setKeywordInput(`Uploaded ${keywords.length} keywords from ${file.name}`)
      }
      reader.readAsText(file)
    }
  }

  const handleGSCImport = () => {
    setIsProcessing(true)
    setTimeout(() => {
      const mockGSCKeywords = [
        "seo tools online",
        "keyword research free",
        "backlink analysis tool",
        "rank tracking software",
        "competitor analysis seo",
      ]
      setParsedKeywords(mockGSCKeywords)
      setKeywordInput(`Imported ${mockGSCKeywords.length} keywords from Google Search Console`)
      setIsProcessing(false)
    }, 2000)
  }

const handleAddKeywords = async () => {
  setIsProcessing(true)
  const processedKeywords = processKeywords()

  try {
    if (!selectedLocation) {
      toast.error("Please select a location")
      setIsProcessing(false)
      return
    }

    // Map "both" → "desktop" for this endpoint
    const device = selectedDevice === "both" ? "desktop" : selectedDevice
    const engine_id =
      device === "mobile"
        ? selectedLocation.engine_id_mobile
        : selectedLocation.engine_id_desktop

    const payload = {
      project_id: selectedProject!.id,
      keywords: processedKeywords,
      device,
      engine_id,
      country: selectedLocation.label,
    }

    await axios.post(
      `${BASE_URL_WR}project-keywords/`,
      // `${BASE_URL_WR}tracking/seranking/start/`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    )

    onAdd()
    setShowAddModal(false)
    resetModal()
  } catch (error: any) {
    if (error.response) {
      console.error("API Error:", error.response.data)
      toast.error(error.response.data?.message || "API request failed")
    } else if (error.request) {
      console.error("No response received:", error.request)
      toast.error("No response from server")
    } else {
      console.error("Unexpected Error:", error.message)
      toast.error("Unexpected error occurred")
    }
  } finally {
    setIsProcessing(false)
  }
}


  const addTag = () => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      setSelectedTags([...selectedTags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag !== tagToRemove))
  }

const handleSearch = async (value: string) => {
  if (value.trim().length < 3) {
    setSearchResults([])
    return
  }
  try {
    setFetching(true)
    const res = await axios.get(
      `${BASE_URL_WR}search-engines/`,
      {
        params: { country: value.toLowerCase() },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    )
    const rows = (res?.data ?? []) as Array<{
      id: number
      country: string
      engine_id_desktop: number
      engine_id_mobile: number
    }>

    const mapped: LocationOption[] = rows.map((r) => ({
      id: r.id,
      label: r.country,
      engine_id_desktop: r.engine_id_desktop,
      engine_id_mobile: r.engine_id_mobile,
    }))

    setSearchResults(mapped)
  } catch (err) {
    console.error("Error fetching search engines:", err)
    toast.error("Could not fetch locations. Try a different country name.")
  } finally {
    setFetching(false)
  }
}


  const processKeywords = () => {
    let processed = [...parsedKeywords]

    if (removeDuplicates) {
      processed = [...new Set(processed)]
    }

    if (removeStopWords) {
      const stopWords = ["the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"]
      processed = processed
        .map((keyword) =>
          keyword
            .split(" ")
            .filter((word) => !stopWords.includes(word.toLowerCase()))
            .join(" "),
        )
        .filter((k) => k.length > 0)
    }

    return processed
  }
  const resetModal = () => {
    setModalStep(1)
    setInputMethod("manual")
    setKeywordInput("")
    setParsedKeywords([])
    setSelectedFolder("unassigned")
    setSelectedTags([])
    setSelectedPriority("medium")
    setSelectedDevice("desktop")
    setSelectedLocation(null)
    setNewTag("")
  }
  return (
    <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
      <DialogContent className="min-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Keywords to Tracking</DialogTitle>
          <DialogDescription>Add new keywords to track their rankings and performance</DialogDescription>
        </DialogHeader>
        <motion.div
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    modalStep >= step ? "bg-brand-blue1 text-white" : "bg-muted text-muted-foreground"
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {modalStep > step ? <Check className="w-4 h-4" /> : step}
                </motion.div>
                {step < 3 && (
                  <motion.div
                    className={`w-12 h-0.5 mx-2 transition-all duration-300 ${modalStep > step ? "bg-brand-blue1" : "bg-black"}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: modalStep > step ? 1 : 0.3 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">Step {modalStep} of 3</div>
        </motion.div>
        <AnimatePresence mode="wait">
          {modalStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* ... existing step 1 content ... */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Choose Input Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      method: "manual",
                      icon: FileText,
                      title: "Manual Entry",
                      desc: "Type or paste keywords one per line",
                    },
                    {
                      method: "csv",
                      icon: Upload,
                      title: "Upload CSV",
                      desc: "Upload a CSV file with keywords to track",
                    },
                    {
                      method: "gsc",
                      icon: Link,
                      title: "Import from GSC",
                      desc: "Import from Google Search Console",
                    },
                  ].map(({ method, icon: Icon, title, desc }) => (
                    <motion.div key={method} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Card
                        className={`cursor-pointer transition-all duration-200 ${
                          inputMethod === method ? "border-brand-blue1 bg-brand-blue1/5" : ""
                        }`}
                        onClick={() => handleInputMethodChange(method as any)}
                      >
                        <CardContent className=" text-center">
                          <Icon className="w-8 h-8 mx-auto mb-3 text-brand-blue1" />
                          <h4 className="font-medium mb-2">{title}</h4>
                          <p className="text-sm text-muted-foreground">{desc}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Input areas remain the same but with enhanced animations */}
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {/* ... existing input method content ... */}
                {inputMethod === "manual" && (
                  <div>
                    <label htmlFor="keywords">Keywords (one per line)</label>
                    <Textarea
                      id="keywords"
                      placeholder="seo audit tool&#10;best backlink checker&#10;free keyword planner"
                      value={keywordInput}
                      onChange={(e) => handleKeywordInputChange(e.target.value)}
                      className="min-h-[120px] mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-2">{parsedKeywords.length} keywords entered</p>
                  </div>
                )}

                {inputMethod === "csv" && (
                  <div>
                    <label htmlFor="csv-upload">Upload CSV File</label>
                    <div className="mt-2 border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-3">
                        Drag and drop your CSV file here, or click to browse
                      </p>
                      <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
                      <Button variant="outline" asChild>
                        <label htmlFor="csv-upload" className="cursor-pointer">
                          Choose File
                        </label>
                      </Button>
                    </div>
                    {keywordInput && <p className="text-sm text-brand-blue1 mt-2">{keywordInput}</p>}
                  </div>
                )}

                {inputMethod === "gsc" && (
                  <div>
                    <label>Import from Google Search Console</label>
                    <div className="mt-2 p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Connected: wranker.com</span>
                        <Badge variant="outline" className="text-green-600">
                          Connected
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Import recent search queries from your verified GSC property
                      </p>
                      <Button onClick={handleGSCImport} disabled={isProcessing} className="w-full">
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Link className="w-4 h-4 mr-2" />
                            Import Keywords
                          </>
                        )}
                      </Button>
                    </div>
                    {keywordInput && <p className="text-sm text-brand-blue1 mt-2">{keywordInput}</p>}
                  </div>
                )}
              </motion.div>

              <div className="flex justify-end">
                <motion.div>
                  <Button
                    className="bg-brand-blue1 hover:bg-brand-blue1/803"
                    onClick={() => setModalStep(2)}
                    disabled={parsedKeywords.length === 0}
                  >
                    Next: Preview & Settings
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
          {/* Similar enhancements for steps 2 and 3... */}
          {modalStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-semibold mb-4">Preview & Settings</h3>

                {/* Processing Options */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="remove-duplicates" className="text-brand-blue1 cursor-pointer">
                        Remove Duplicates
                      </label>
                      <p className="text-sm text-muted-foreground">Automatically remove duplicate keywords</p>
                    </div>
                    <Switch id="remove-duplicates" checked={removeDuplicates} onCheckedChange={setRemoveDuplicates} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="remove-stop-words" className="text-brand-blue1 cursor-pointer">
                        Remove Stop Words
                      </label>
                      <p className="text-sm text-muted-foreground">Filter out common non-keyword terms</p>
                    </div>
                    <Switch id="remove-stop-words" checked={removeStopWords} onCheckedChange={setRemoveStopWords} />
                  </div>
                </div>

                <Separator />

                {/* Keywords Preview */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <label>Keywords Preview</label>
                    <Badge variant="secondary">{processKeywords().length} keywords</Badge>
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/50">
                    <div className="flex flex-wrap gap-2">
                      {processKeywords()
                        .slice(0, 50)
                        .map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      {processKeywords().length > 50 && (
                        <Badge variant="outline" className="text-xs">
                          +{processKeywords().length - 50} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setModalStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setModalStep(3)} className="bg-brand-blue1 hover:bg-brand-blue1/803">
                  Next: Assign Properties
                </Button>
              </div>
            </motion.div>
          )}

          {modalStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-semibold mb-4">Assign Meta Properties</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Folder */}
                  <div>
                    <label htmlFor="folder">Folder</label>
                    <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        <SelectItem value="seo-tools">SEO Tools</SelectItem>
                        <SelectItem value="backlinks">Backlinks</SelectItem>
                        <SelectItem value="keyword-tools">Keyword Tools</SelectItem>
                        <SelectItem value="local-seo">Local SEO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label>Priority</label>
                    <div className="flex gap-2 mt-2">
                      {[
                        { value: "high", label: "High", color: "bg-red-500" },
                        { value: "medium", label: "Medium", color: "bg-yellow-500" },
                        { value: "low", label: "Low", color: "bg-green-500" },
                      ].map((priority) => (
                        <Button
                          key={priority.value}
                          size="sm"
                          onClick={() => setSelectedPriority(priority.value)}
                          className={`flex items-center gap-2 px-3 py-1 rounded-md transition-colors
    ${
      selectedPriority === priority.value
        ? "bg-brand-blue1 hover:bg-brand-blue1/80 text-white"
        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
    } `}
                        >
                          <div className={`w-3 h-3 rounded-full ${priority.color}`} />
                          {priority.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Device */}
                  <div>
                    <label>Device</label>
                    <div className="flex gap-2 mt-2">
                      {[
                        { value: "desktop", label: "Desktop", icon: Monitor },
                        { value: "mobile", label: "Mobile", icon: Smartphone },
                        { value: "both", label: "Both", icon: Monitor }, // You may want to show both icons here
                      ].map((device) => (
                        <Button
                          key={device.value}
                          variant={selectedDevice === device.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedDevice(device.value)}
                          className={`flex items-center gap-2 px-3 py-1 rounded-md transition-colors
    ${
      selectedDevice === device.value
        ? "bg-brand-blue1 hover:bg-brand-blue1/80 text-white"
        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
    } `}
                        >
                          <device.icon className="w-4 h-4" />
                          {device.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label>Location</label>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-[300px] justify-between mt-2 bg-transparent"
                        >
                          {selectedLocation ? selectedLocation.label : "Select location..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput placeholder="Search locations..." onValueChange={handleSearch} />
                          <CommandList>
                            {fetching && <CommandEmpty>Loading...</CommandEmpty>}
                            {!fetching && searchResults.length === 0 && (
                              <CommandEmpty>Type 3+ letters to search</CommandEmpty>
                            )}
<CommandGroup>
  {searchResults.map((item) => (
    <CommandItem
      key={item.id}
      value={item.label}
      onSelect={() => {
        setSelectedLocation(item)
        setOpen(false)
      }}
    >
      {item.label}
    </CommandItem>
  ))}
</CommandGroup>

                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Tags */}
                {/* <div className="mt-6">
                              <Label>Tags</Label>
                              <div className="flex gap-2 mt-2">
                                <Input
                                  placeholder="Add a tag..."
                                  value={newTag}
                                  onChange={(e) => setNewTag(e.target.value)}
                                  onKeyPress={(e) => e.key === "Enter" && addTag()}
                                  className="flex-1"
                                />
                                <Button onClick={addTag} size="sm" className="bg-brand-blue1 hover:bg-brand-blue1/80">
                                  Add
                                </Button>
                              </div>
                              {selectedTags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {selectedTags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                      {tag}
                                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div> */}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setModalStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={handleAddKeywords}
                  disabled={isProcessing}
                  className="min-w-[140px] bg-brand-blue1 hover:bg-brand-blue1/80"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Tracking
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

export default KeywordAddModal
