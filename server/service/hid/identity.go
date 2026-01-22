package hid

import (
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"NanoKVM-Server/proto"
)

const (
	UsbVidFile          = "/boot/usb.vid"
	UsbPidFile          = "/boot/usb.pid"
	UsbManufacturerFile = "/boot/usb.manufacturer"
	UsbProductFile      = "/boot/usb.product"

	DefaultVID          = "0x3346"
	DefaultPID          = "0x1009"
	DefaultManufacturer = "sipeed"
	DefaultProduct      = "NanoKVM"
)

func (s *Service) GetUsbIdentity(c *gin.Context) {
	var rsp proto.Response

	identity := proto.UsbIdentityRsp{
		VID:          readFileOrDefault(UsbVidFile, DefaultVID),
		PID:          readFileOrDefault(UsbPidFile, DefaultPID),
		Manufacturer: readFileOrDefault(UsbManufacturerFile, DefaultManufacturer),
		Product:      readFileOrDefault(UsbProductFile, DefaultProduct),
	}

	rsp.OkRspWithData(c, &identity)
	log.Debugf("get usb identity: %+v", identity)
}

func (s *Service) SetUsbIdentity(c *gin.Context) {
	var req proto.SetUsbIdentityReq
	var rsp proto.Response

	if err := proto.ParseFormRequest(c, &req); err != nil {
		rsp.ErrRsp(c, -1, "invalid arguments")
		return
	}

	if err := writeUsbIdentityFile(UsbVidFile, req.VID); err != nil {
		rsp.ErrRsp(c, -2, "failed to save VID")
		return
	}

	if err := writeUsbIdentityFile(UsbPidFile, req.PID); err != nil {
		rsp.ErrRsp(c, -3, "failed to save PID")
		return
	}

	if req.Manufacturer != "" {
		if err := writeUsbIdentityFile(UsbManufacturerFile, req.Manufacturer); err != nil {
			rsp.ErrRsp(c, -4, "failed to save manufacturer")
			return
		}
	} else {
		_ = os.Remove(UsbManufacturerFile)
	}

	if req.Product != "" {
		if err := writeUsbIdentityFile(UsbProductFile, req.Product); err != nil {
			rsp.ErrRsp(c, -5, "failed to save product")
			return
		}
	} else {
		_ = os.Remove(UsbProductFile)
	}

	rsp.OkRsp(c)
	log.Debugf("set usb identity: vid=%s, pid=%s, manufacturer=%s, product=%s",
		req.VID, req.PID, req.Manufacturer, req.Product)
}

func readFileOrDefault(path string, defaultValue string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return defaultValue
	}
	value := strings.TrimSpace(string(data))
	if value == "" {
		return defaultValue
	}
	return value
}

func writeUsbIdentityFile(path string, value string) error {
	err := os.WriteFile(path, []byte(value), 0644)
	if err != nil {
		log.Errorf("failed to write %s: %s", path, err)
		return err
	}
	return nil
}
