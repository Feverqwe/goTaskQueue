package internal

import (
	"log"
	"net"
	"strconv"
)

func GetAddresses(port int) []string {
	portPostfix := ""
	if port != 80 {
		portPostfix = ":" + strconv.Itoa(port)
	}
	result := make([]string, 0)
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		log.Println("Interfaces error", err)
		return result
	}
	for _, address := range addrs {
		if ipnet, ok := address.(*net.IPNet); ok && ipnet.IP.IsGlobalUnicast() {
			if ipnet.IP.To4() != nil {
				ip := ipnet.IP.String()
				result = append(result, "http://"+ip+portPostfix)
			}
		}
	}
	return result
}
