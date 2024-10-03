// Category.cs
using System.ComponentModel.DataAnnotations;

namespace DevTrack.DAL.Models
{
    public class Category
    {
        public int CategoryID { get; set; }

        [Required(ErrorMessage = "Category Name is required.")]
        [StringLength(255, ErrorMessage = "Category Name cannot exceed 255 characters.")]
        public string CategoryName { get; set; }
    }
}