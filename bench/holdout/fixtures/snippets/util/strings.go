// util/strings.go
package util

import (
    "strings"
)

func CountWords(text string) int {
    words := strings.Fields(text)
    return len(words)
}

func TruncateWords(text string, max int) string {
    words := strings.Fields(text)
    if len(words) <= max {
        return text
    }
    return strings.Join(words[:max], " ")
}
