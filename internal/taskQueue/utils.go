package taskQueue

import (
	"github.com/sbinet/pstree"
)

func GetProcessPids(pid int) (pids []int, err error) {
	pids = append(pids, pid)
	var tree *pstree.Tree
	tree, err = pstree.New()
	if err != nil {
		return
	}
	var next func(pid int)
	next = func(pid int) {
		for _, cid := range tree.Procs[pid].Children {
			proc := tree.Procs[cid]
			pids = append(pids, proc.Stat.PID)
			next(cid)
		}
	}
	next(pid)
	return
}
