// CustomField.cs
using System.ComponentModel.DataAnnotations;

namespace DevTrack.DAL.Models
{
    public class CustomField
    {
        public int CustomFieldId { get; set; }

        [Required(ErrorMessage = "Field Name is required.")]
        [StringLength(255, ErrorMessage = "Field Name cannot exceed 255 characters.")]
        public string FieldName { get; set; }

        // ... other properties
    }
}