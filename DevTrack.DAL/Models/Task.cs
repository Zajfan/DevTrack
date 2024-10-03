// Task.cs
using System.ComponentModel.DataAnnotations;

namespace DevTrack.DAL.Models
{
    public class Task
    {
        public int TaskID { get; set; }

        [Required(ErrorMessage = "Project ID is required.")]
        public int ProjectID { get; set; }

        [Required(ErrorMessage = "Task Name is required.")]
        [StringLength(255, ErrorMessage = "Task Name cannot exceed 255 characters.")]
        public string TaskName { get; set; }

        public string Description { get; set; }

        [Required(ErrorMessage = "Assigned To is required.")]
        public int AssignedTo { get; set; }

        public DateTime? DueDate { get; set; }

        [Required(ErrorMessage = "Status is required.")]
        [StringLength(20, ErrorMessage = "Status cannot exceed 20 characters.")]
        public string Status { get; set; }

        public int? Priority { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "Estimated Time must be a non-negative value.")]
        public int? EstimatedTime { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "Actual Time must be a non-negative value.")]
        public int? ActualTime { get; set; }

        public int? DependsOnTaskId { get; set; }
    }
}