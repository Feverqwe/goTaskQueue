package taskstruct

type TaskBaseTemplate struct {
	Label            string `json:"label"`
	Group            string `json:"group"`
	IsPty            bool   `json:"isPty"`
	IsOnlyCombined   bool   `json:"isOnlyCombined"`
	IsSingleInstance bool   `json:"isSingleInstance"`
	IsStartOnBoot    bool   `json:"isStartOnBoot"`
}

type TaskBase struct {
	Command       string `json:"command"`
	TemplatePlace string `json:"templatePlace"`
	TaskBaseTemplate
}
